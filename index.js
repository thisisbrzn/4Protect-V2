import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";

// ====== CONFIG ======
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
const prefix = config.prefix;

// ====== KEEP-ALIVE POUR KOYEB ======
const app = express();
app.get("/", (req, res) => {
  res.send("Bot Actif 24/7 sur Koyeb");
});
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ====== CLIENT ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ====== COMMANDES ======
client.commands = new Collection();

// Charger les commandes
fs.readdirSync("./Commands").forEach(async (file) => {
  if (file.endsWith(".js")) {
    const cmd = await import(`./Commands/${file}`);
    if (cmd.name && cmd.run) {
      client.commands.set(cmd.name.toLowerCase(), cmd);
      console.log(`Commande chargée : ${cmd.name}`);
    } else {
      console.log(`⚠️  Commande invalide dans le fichier : ${file}`);
    }
  }
});

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.run(client, message, args);
  } catch (e) {
    console.error(e);
    message.reply("❌ Une erreur est survenue lors de l'exécution de la commande.");
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
