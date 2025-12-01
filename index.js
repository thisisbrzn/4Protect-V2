import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";
import config from "./config.js"; // On importe le config.js qui met le token depuis l'env

// ====== PREFIX ======
const prefix = config.prefix;

// ====== KEEP-ALIVE POUR KOYEB ======
const app = express();
app.get("/", (req, res) => {
  res.send("Bot Actif 24/7 sur Koyeb");
});
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ====== CLIENT DISCORD ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ====== COMMANDES ======
client.commands = new Collection();

// Charger les commandes automatiquement
fs.readdirSync("./Commands").forEach(file => {
  if (file.endsWith(".js")) {
    import(`./Commands/${file}`).then(cmd => {
      client.commands.set(cmd.name, cmd);
      console.log(`Commande chargée : ${cmd.name}`);
    });
  }
});

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.run(client, message, args);
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
