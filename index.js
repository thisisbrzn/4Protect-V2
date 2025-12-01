import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import express from "express";

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
config.token = process.env.TOKEN;

const prefix = config.prefix;

// ====== KEEP ALIVE POUR KOYEB ======
const app = express();
app.get("/", (_, res) => res.send("Bot Actif 24/7 sur Koyeb"));
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

// ====== LECTURE RECURSIVE DES DOSSIERS ======
function loadCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    // Sous-dossier → on continue
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    // Fichier JS
    if (file.endsWith(".js")) {
      import(fullPath)
        .then(module => {
          const cmd = module.command;

          if (!cmd || !cmd.name) return;

          client.commands.set(cmd.name, cmd);
          console.log(`Commande chargée : ${cmd.name}`);
        })
        .catch(err => console.error("Erreur chargement commande :", err));
    }
  }
}

// Charger TOUTES les commandes (même dans /Commands/Modérations etc.)
loadCommands("./Commands");

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();

  const cmd = client.commands.get(cmdName);
  if (!cmd) return;

  try {
    await cmd.run(client, message, args);
  } catch (err) {
    console.error(err);
    message.reply("❌ Une erreur est survenue.");
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
