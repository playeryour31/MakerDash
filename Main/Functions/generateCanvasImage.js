const { createCanvas, loadImage } = require('canvas');
const fs = require("fs");
const path = require("path");

async function generateCanvasImage(type, interaction) {
    try {
        const text = `Bot ${type} was purchased by ${interaction.member.displayName}`;
        
        const templatePath = path.join(__dirname, "../Resources/Done.png");

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template image (Done.png) not found at ${templatePath}`);
        }

        // التحقق من نوع الصورة قبل تحميلها
        const ext = path.extname(templatePath).toLowerCase();
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            throw new Error(`Unsupported image type for template image. Supported types: .png, .jpg, .jpeg`);
        }

        const templateImage = await loadImage(templatePath);

        const canvas = createCanvas(1920, 270);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(templateImage, 0, 0, 1920, 270);

        ctx.fillStyle = "#3e3e3e";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "left";
        ctx.fillText(text, 268, 170);

        const avatarUrl = interaction.user.displayAvatarURL({ format: "png", size: 256 });

        // التحقق من نوع صورة الأفاتار
        if (!avatarUrl || !avatarUrl.endsWith(".png") && !avatarUrl.endsWith(".jpg") && !avatarUrl.endsWith(".jpeg")) {
            throw new Error(`Unsupported avatar image type. Supported types: .png, .jpg, .jpeg`);
        }

        const avatar = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(49 + 91.5, 44 + 91.5, 91.5, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 49, 44, 183, 183);
        ctx.restore();

        const output = canvas.toBuffer('image/png');
        fs.writeFileSync(`./test.png`, output);  
        console.log(`Image saved successfully`);

    } catch (error) {
        console.error(error);
    }
}

module.exports = { generateCanvasImage };
