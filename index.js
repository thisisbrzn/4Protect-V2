import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";

// ====== CONFIG ======
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
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
fs.readdirSync("./Commands").forEach(file => {
  if (file.endsWith(".js")) {
    import(`./Commands/${file}`).then(module => {
      // Si ta commande exporte directement une fonction
      const commandFunction = module.default || module;
      if (typeof commandFunction === "function") {
        client.commands.set(file, commandFunction);
        console.log(`Commande chargée : ${file}`);
      }
    }).catch(err => console.error(`Erreur chargement ${file} :`, err));
  }
});

// ====== HANDLER DES MESSAGES ======
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const commandFunc = client.commands.get(`${commandName}.js`);
  if (!commandFunc) return;

  try {
    await commandFunc(client, message, args);
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
