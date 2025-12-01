import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";

// ================== CONFIG ==================
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
config.token = process.env.TOKEN; // Token Koyeb
const prefix = config.prefix;
const owners = config.owners || []; // Pour éviter erreur si vide

// ================== KEEP ALIVE KOYEB ==================
const app = express();
app.get("/", (req, res) => res.send("Bot actif 24/7 sur Koyeb"));
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.commands = new Collection();

// ================== CHARGER COMMANDES ==================
// Ancien format : chaque fichier exporte simplement une fonction
fs.readdirSync("./Commands").forEach(file => {
  if (!file.endsWith(".js")) return;

  import(`./Commands/${file}`)
    .then(module => {
      const cmd = module.default || module;
      if (typeof cmd === "function") {
        const commandName = file.replace(".js", "");
        client.commands.set(commandName, cmd);
        console.log(`Commande chargée : ${commandName}`);
      }
    })
    .catch(err => console.error(`Erreur chargement ${file} :`, err));
});

// ================== MESSAGE HANDLER ==================
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const commandFunc = client.commands.get(commandName);
  if (!commandFunc) return;

  // Vérifie si l'auteur est owner
  if (commandFunc.requireOwner && !owners.includes(message.author.id)) {
    return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
  }

  try {
    await commandFunc(client, message, args);
  } catch (e) {
    console.error(e);
    message.reply("❌ Une erreur est survenue.");
  }
});

// ================== READY ==================
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ================== LOGIN ==================
client.login(config.token);
