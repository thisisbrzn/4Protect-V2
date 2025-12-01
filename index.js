import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import express from "express";

// ===== CONFIG =====
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
config.token = process.env.TOKEN;

const prefix = config.prefix;

// ===== KEEP-ALIVE KOYEB =====
const app = express();
app.get("/", (req, res) => res.send("Bot Actif 24/7 sur Koyeb"));
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// ===== CHARGEMENT RECURSIF DES COMMANDES =====
function loadCommands(directory) {
  for (const file of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    // Si c'est un dossier → on le charge récursivement
    if (stat.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    // Charger uniquement les fichiers .js
    if (file.endsWith(".js")) {
      import(`./${fullPath}`).then(module => {
        const command = module.default || module;
        if (typeof command === "function") {
          const name = file.replace(".js", "");
          client.commands.set(name, command);
          console.log(`✔ Commande chargée : ${name}`);
        }
      });
    }
  }
}

loadCommands("Commands");

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command(client, message, args);
  } catch (err) {
    console.error(err);
    message.reply("❌ Une erreur est survenue dans la commande.");
  }
});

// ===== READY =====
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ===== LOGIN =====
client.login(config.token);
