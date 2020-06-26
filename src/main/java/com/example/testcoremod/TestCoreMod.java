package com.example.testcoremod;

import net.minecraft.entity.item.ItemFrameEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod("testcoremod")
public class TestCoreMod {
    public static final Logger LOGGER = LogManager.getLogger();

    public TestCoreMod() {
        MinecraftForge.EVENT_BUS.register(this);
    }

    @SubscribeEvent
    public void onRotatingItemInItemFrame(TestEventHook.RotateItemInItemFrameEvent event) {
        ItemFrameEntity itemFrame = event.getItemFrameEntity();
        ItemStack stack = itemFrame.getDisplayedItem();
        String itemName = stack.getItem().getDisplayName(stack).getFormattedText();
        PlayerEntity player = event.getPlayer();
        String playerName = player.getDisplayName().getFormattedText();

        if (player.isSteppingCarefully()) {
            // Player is sneaking
            LOGGER.info("{} in the item frame at {} was rotated by {}.", itemName, itemFrame.getPosition(), playerName);
        } else {
            LOGGER.info("Only sneaking player can rotate the item in the item frame.");
            event.setCanceled(true);
        }
    }
}
