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
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Serveur HTTP actif sur le port ${PORT}`));

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

// Charger toutes les commandes
fs.readdirSync("./Commands").forEach(file => {
  if (file.endsWith(".js")) {
    import(`./Commands/${file}`).then(cmd => {
      if (cmd.name && cmd.run) {
        client.commands.set(cmd.name, cmd);
        console.log(`Commande chargée : ${cmd.name}`);
      }
    }).catch(err => console.error(`Erreur chargement commande ${file}:`, err));
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
if (!process.env.TOKEN) {
  console.error("⚠️ Token manquant ! Assurez-vous de configurer la variable d'environnement TOKEN sur Koyeb.");
  process.exit(1);
}

client.login(process.env.TOKEN);
