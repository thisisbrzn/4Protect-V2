import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "node:path";
import express from "express";

// ====== CONFIG ======
const rawConfig = fs.readFileSync("./config.json", "utf8");
const config = JSON.parse(rawConfig);
config.token = process.env.TOKEN;
const prefix = config.prefix;

// ====== KEEP-ALIVE POUR KOYEB ======
const app = express();
app.get("/", (req, res) => res.send("Bot Actif 24/7 sur Koyeb"));
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ====== CLIENT ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// ====== CHARGEMENT DES COMMANDES ======
const commandsPath = path.join('./Commands');
const loadCommands = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            loadCommands(filepath);
        } else if (file.endsWith('.js')) {
            import(filepath).then(module => {
                const commandFunc = module.command || module.default || module;
                if (commandFunc && commandFunc.name) {
                    client.commands.set(commandFunc.name, commandFunc);
                    console.log(`Commande chargée : ${commandFunc.name}`);
                }
            }).catch(err => console.error(`Erreur chargement ${file} :`, err));
        }
    });
};
loadCommands(commandsPath);

// ====== HANDLER DES MESSAGES ======
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.run(client, message, args, config);
    } catch (e) {
        console.error(e);
        message.reply("❌ Une erreur est survenue.");
    }
});

// ====== HANDLER DES INTERACTIONS ======
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    // Parcours toutes les commandes qui exportent interactionHandler
    for (const cmd of client.commands.values()) {
        if (cmd.interactionHandler) {
            try {
                await cmd.interactionHandler(client, interaction, config);
            } catch (err) {
                console.error('Erreur interactionHandler:', err);
            }
        }
    }
});

// ====== READY ======
client.on("ready", () => {
    console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
