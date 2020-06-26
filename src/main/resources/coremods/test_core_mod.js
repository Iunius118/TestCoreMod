function initializeCoreMod() {
    return {
        'coremodmethod': {
            'target': {
                'type': 'METHOD',
                'class': 'net.minecraft.entity.item.ItemFrameEntity',
                'methodName': 'func_184230_a',  // ItemFrameEntity#processInitialInteract
                'methodDesc': '(Lnet/minecraft/entity/player/PlayerEntity;Lnet/minecraft/util/Hand;)Z'
            },
            'transformer': function(method) {
                var Opcodes = Java.type('org.objectweb.asm.Opcodes');
                var arrayLength = method.instructions.size();

                for (var i = 0; i < arrayLength; ++i) {
                    // ItemFrameEntity#processInitialInteract内のthis.playSound(SoundEvents.ENTITY_ITEM_FRAME_ROTATE_ITEM, 1.0F, 1.0F);の直前にイベントのフックを挿入する
                    // そのために、まずは SoundEvents.ENTITY_ITEM_FRAME_ROTATE_ITEM をロードしているinstruction（insn）コードを探す
                    var insn = method.instructions.get(i);
                    var isTargetInsn = (
                            insn.getOpcode() == Opcodes.GETSTATIC
                            && insn.owner == 'net/minecraft/util/SoundEvents'
                            && (insn.name == 'field_187632_cP' || insn.name == 'ENTITY_ITEM_FRAME_ROTATE_ITEM'));
                    if (!isTargetInsn) continue;
                    // insn == GETSTATIC net/minecraft/util/SoundEvents.ENTITY_ITEM_FRAME_ROTATE_ITEM : Lnet/minecraft/util/SoundEvent;

                    // 次に、ひとつ前のinsnコードを取得してthisをロードしているコード（this.playSound()を呼び出すための最初のinsnコード）か確認する
                    insn = insn.getPrevious();
                    isTargetInsn = (
                            insn.getOpcode() == Opcodes.ALOAD
                            && insn.var == 0);
                    if (!isTargetInsn) continue;
                    // insn == ALOAD 0

                    // 使用する各ノードのJavaクラスを取得
                    var VarInsnNode = Java.type('org.objectweb.asm.tree.VarInsnNode');
                    var MethodInsnNode = Java.type('org.objectweb.asm.tree.MethodInsnNode');
                    var LabelNode = Java.type('org.objectweb.asm.tree.LabelNode');
                    var JumpInsnNode = Java.type('org.objectweb.asm.tree.JumpInsnNode');
                    var InsnNode = Java.type('org.objectweb.asm.tree.InsnNode');

                    // this.playSound()呼び出しの直前にif (TestEventHook.onRotatingItemInItemFrame(this, player, hand)) return true;のinsnコードをを挿入する
                    // まずはTestEventHook.onRotatingItemInItemFrame(this, player, hand)の呼び出し
                    method.instructions.insertBefore(insn, new VarInsnNode(Opcodes.ALOAD, 0));  // thisをロード
                    method.instructions.insertBefore(insn, new VarInsnNode(Opcodes.ALOAD, 1));  // playerをロード
                    method.instructions.insertBefore(insn, new VarInsnNode(Opcodes.ALOAD, 2));  // handをロード
                    method.instructions.insertBefore(insn, new MethodInsnNode(
                            Opcodes.INVOKESTATIC, 'com/example/testcoremod/TestEventHook', 'onRotatingItemInItemFrame',
                            '(Lnet/minecraft/entity/item/ItemFrameEntity;Lnet/minecraft/entity/player/PlayerEntity;Lnet/minecraft/util/Hand;)Z', false)); // イベントを発生させる
                    var label = new LabelNode();    // イベントがキャンセルされなかったときに飛ぶ位置のラベル
                    method.instructions.insertBefore(insn, new JumpInsnNode(Opcodes.IFEQ, label));  // 戻り値が0（false）ならイベントがキャンセルされなかったので通常処理へジャンプ
                    method.instructions.insertBefore(insn, new InsnNode(Opcodes.ICONST_1)); // trueを…
                    method.instructions.insertBefore(insn, new InsnNode(Opcodes.IRETURN));  // ItemFrameEntity#processInitialInteractの戻り値として返す
                    method.instructions.insertBefore(insn, label);  // イベントがキャンセルされなかったときはここへ飛ぶ

                    print("Transformed!");
                    break;
                }

                return method;
            }
        }
    };
}
