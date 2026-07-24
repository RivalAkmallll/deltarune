/*
 * Delta Rune Bot - Power Calculation Utility
 * Copyright (C) 2026 Custom Edition
 */

module.exports = {
    calculatePower: function (invItems) {
        let totalPower = 0;

        if (!invItems || invItems.length === 0) return 0;

        for (let item of invItems) {
            let count = parseInt(item.count) || 0;
            let weight = 10; // Bobot dasar per item

            // Berikan bobot nilai power lebih tinggi berdasarkan jenis item/ID jika diperlukan
            if (item.id >= 100 && item.id < 200) {
                weight = 50; // Contoh untuk kategori senjata/equipment khusus
            } else if (item.id >= 200) {
                weight = 25; // Kategori box/crate/loot
            }

            totalPower += count * weight;
        }

        return totalPower;
    }
};