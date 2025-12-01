import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";
import path from "path";

// ====== CONFIG ======
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
config.token = process.env.TOKEN; // token depuis variable d'environnement
const prefix = config.prefix;

// ====== KEEP-ALIVE POUR KOYEB ======
const app = express();
app.get("/", (req, res) => res.send("Bot actif 24/7 sur Koyeb"));
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

// ====== CHARGEMENT COMMANDES ======
const commandsPath = path.join(process.cwd(), "Commands");
const loadCommands = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      loadCommands(fullPath);
    } else if (file.endsWith(".js")) {
      import(fullPath).then(mod => {
        const cmd = mod.command || mod.default;
        if (cmd && cmd.name) {
          client.commands.set(cmd.name, cmd);
          console.log(`Commande chargée : ${cmd.name}`);
        }
      }).catch(err => console.error(`Erreur chargement ${file} :`, err));
    }
  });
};
loadCommands(commandsPath);

// ====== HANDLER COMMANDES TEXTE ======
client.on("messageCreate", async (message) => {
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

// ====== HANDLER INTERACTIONS (boutons / select menus) ======
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      // Exemple pour bouton ticket
      if (interaction.customId === "ticket_button") {
        await interaction.reply({ content: "Ticket créé !", ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      // Exemple pour menu select
      if (interaction.customId === "ticket_reason") {
        const selected = interaction.values[0];
        await interaction.reply({ content: `Tu as choisi : ${selected}`, ephemeral: true });
      }
    }
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("❌ Une erreur est survenue.");
    } else {
      await interaction.reply("❌ Une erreur est survenue.");
    }
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
