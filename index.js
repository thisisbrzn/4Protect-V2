import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import express from "express";

// ====== CONFIG ======
const config = JSON.parse(fs.readFileSync(new URL("./config.json", import.meta.url), "utf8"));
// On peut remplacer le token par une variable d'environnement si tu veux
config.token = process.env.TOKEN || config.token;

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
const commandsPath = path.join("./Commands");
fs.readdirSync(commandsPath).forEach(folder => {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) return;

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
  files.forEach(async file => {
    const filePath = path.join(folderPath, file);
    try {
      const cmdModule = await import(pathToFileURL(filePath).href);
      if (cmdModule.command && cmdModule.command.name && cmdModule.command.run) {
        client.commands.set(cmdModule.command.name, cmdModule.command.run);
        console.log(`Commande chargée : ${cmdModule.command.name}`);
      }
    } catch (err) {
      console.error(`Erreur chargement commande ${file}:`, err);
    }
  });
});

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const commandFunc = client.commands.get(commandName);
  if (!commandFunc) return;

  try {
    await commandFunc(client, message, args, config);
  } catch (e) {
    console.error(e);
    message.reply("❌ Une erreur est survenue.");
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);

// ====== UTIL ======
import { fileURLToPath, pathToFileURL } from "url";
