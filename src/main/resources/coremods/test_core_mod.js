// 使用する各Javaクラスを取得
var ASMAPI = Java.type('net.minecraftforge.coremod.api.ASMAPI');
var Opcodes = Java.type('org.objectweb.asm.Opcodes');
var VarInsnNode = Java.type('org.objectweb.asm.tree.VarInsnNode');
var MethodInsnNode = Java.type('org.objectweb.asm.tree.MethodInsnNode');
var LabelNode = Java.type('org.objectweb.asm.tree.LabelNode');
var JumpInsnNode = Java.type('org.objectweb.asm.tree.JumpInsnNode');
var InsnNode = Java.type('org.objectweb.asm.tree.InsnNode');

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
                // ItemFrameEntity#processInitialInteract内のthis.playSound(SoundEvents.ENTITY_ITEM_FRAME_ROTATE_ITEM, 1.0F, 1.0F);の直前にイベントのフックを挿入する
                // コードを挿入する位置を検索する
                var insn = findTargetInsn(method);

                if (insn) {
                    // 挿入位置が見つかった場合はイベントフックのコードを挿入
                    insertEventHook(method, insn);
                }

                return method;
            }
        }
    };
}

function findTargetInsn(method) {
    var arrayLength = method.instructions.size();

    for (var i = 0; i < arrayLength; ++i) {
        // まずは SoundEvents.ENTITY_ITEM_FRAME_ROTATE_ITEM をロードしているinstruction（insn）コードを探す
        var insn = method.instructions.get(i);
        var isTargetInsn = (
                insn.getOpcode() == Opcodes.GETSTATIC
                && insn.owner == 'net/minecraft/util/SoundEvents'
                && insn.name == ASMAPI.mapField('field_187632_cP'));    // field_187632_cP = ENTITY_ITEM_FRAME_ROTATE_ITEM
        if (!isTargetInsn) continue;
        // insn == GETSTATIC net/minecraft/util/SoundEvents.ENTITY_ITEM_FRAME_ROTATE_ITEM : Lnet/minecraft/util/SoundEvent;

        // 次に、ひとつ前のinsnコードを取得してthisをロードしているコード（this.playSound()を呼び出すための最初のinsnコード）か確認する
        insn = insn.getPrevious();
        isTargetInsn = (
                insn.getOpcode() == Opcodes.ALOAD
                && insn.var == 0);
        if (!isTargetInsn) continue;
        // insn == ALOAD 0

        return insn;
    }

    return null;
}

function insertEventHook(method, insn) {
    // this.playSound()呼び出しの直前にif (TestEventHook.onRotatingItemInItemFrame(this, player, hand)) return true;のinsnコードをを挿入する
    // まずはTestEventHook.onRotatingItemInItemFrame(this, player, hand)の呼び出し
    var label = new LabelNode();    // イベントがキャンセルされなかったときに飛ぶ位置のラベル
    // 挿入するinsnコードのリストを生成
    var list = ASMAPI.listOf(
            new VarInsnNode(Opcodes.ALOAD, 0),  // thisをロード
            new VarInsnNode(Opcodes.ALOAD, 1),  // playerをロード
            new VarInsnNode(Opcodes.ALOAD, 2),  // handをロード
            new MethodInsnNode(Opcodes.INVOKESTATIC, 'com/example/testcoremod/TestEventHook', 'onRotatingItemInItemFrame',
                    '(Lnet/minecraft/entity/item/ItemFrameEntity;Lnet/minecraft/entity/player/PlayerEntity;Lnet/minecraft/util/Hand;)Z', false),    // イベントを発生させる
            new JumpInsnNode(Opcodes.IFEQ, label),  // 戻り値が0（false）ならイベントがキャンセルされなかったので通常処理へジャンプ
                // 以下、イベントがキャンセルされた時の処理
            new InsnNode(Opcodes.ICONST_1), // イベントがキャンセルされたらtrueを...
            new InsnNode(Opcodes.IRETURN),  //   ItemFrameEntity#processInitialInteractの戻り値として返す
                // 以上、イベントがキャンセルされた時の処理
            label   // イベントがキャンセルされなかったときはここへ飛ぶ
            );

    method.instructions.insertBefore(insn, list);   // Insnコードリストをメソッドに挿入
    print("Transformed!");
}
