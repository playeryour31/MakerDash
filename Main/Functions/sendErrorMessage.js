const { WebhookClient, EmbedBuilder, DiscordAPIError } = require('discord.js');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Config = require('../Resources/Config.json');
const db = new Database('./Database/Errors/Errors');

async function sendErrorMessage(client, errorType, error) {
    try {
        if (error instanceof DiscordAPIError) {
            return;
        }

        const webhookId = Config.Errors.ID;
        const webhookToken = Config.Errors.Token;
        const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

        const errorDetails = {
            Type: errorType,
            Message: error.message || 'No message',
            Stack: error.stack || 'No stack trace',
            Timestamp: new Date().toISOString(),
            File: getFileFromStack(error.stack),
            Line: getLineFromStack(error.stack)
        };

        let errors = db.get('Errors') || [];
        let existingError = errors.find(e => e.Message === errorDetails.Message && e.Stack === errorDetails.Stack);

        if (existingError) {
           // console.log('Error already exists. Incrementing the count.');
        } else {
            //existingError.Count = (existingError.Count || 0) + 1;
            db.push('Errors', errorDetails);
           // console.log('New error logged.');
        }

        const errorEmbed = new EmbedBuilder()
            .addFields(
                { name: 'Message', value: `\`\`\`${errorDetails.Message}\`\`\``, inline: false },
                { name: 'Stack', value: `\`\`\`${errorDetails.Stack}\`\`\``, inline: false },
                { name: 'File', value: `\`\`\`${errorDetails.File}\`\`\``, inline: true },
                { name: 'Line', value: `\`\`\`${errorDetails.Line}\`\`\``, inline: true },
                //{ name: 'Count', value: `\`\`\`${existingError.Count}\`\`\``, inline: true }
            )
            .setTimestamp();

        await webhookClient.send({
            username: 'Maker Error Logger',
            embeds: [errorEmbed]
        });

       /// console.log('Error details sent to webhook.');

    } catch (err) {
        console.error(`Failed to send error message in sendErrorMessage: ${err.stack}`);
    }
}

function getFileFromStack(stack) {
    const stackLines = stack.split('\n');
    const line = stackLines[1];
    const filePathMatch = line.match(/\(([^)]+)\)/);
    if (filePathMatch && filePathMatch[1]) {
        const filePath = filePathMatch[1];
        const pathParts = filePath.split('/');
        return `/${pathParts[pathParts.length - 1]}`;  
    }
    return 'Unknown file';
}

function getLineFromStack(stack) {
    const stackLines = stack.split('\n');
    const line = stackLines[1];
    const match = line.match(/:(\d+):(\d+)/);
    if (match) {
        return `${match[1]}:${match[2]}`;
    }
    return 'Unknown line';
}

module.exports = sendErrorMessage;
