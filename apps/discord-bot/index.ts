import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

const todos: Record<string, string[]> = {};

client.on("messageCreate", (message) => {
	if (message.author.bot) return;
	const [command, ...args] = message.content.trim().split(/\s+/);
	if (command === "!todo") {
		const subcommand = args.shift();
		if (subcommand === "add") {
			const text = args.join(" ");
			if (!text) {
				message.channel.send("Usage: !todo add <task>");
				return;
			}
			let list = todos[message.author.id];
			if (!list) {
				list = [];
				todos[message.author.id] = list;
			}
			list.push(text);
			message.channel.send(`Added TODO: ${text}`);
		} else if (subcommand === "list") {
			const list = todos[message.author.id] || [];
			if (list.length === 0) {
				message.channel.send("No TODOs yet.");
			} else {
				message.channel.send(list.map((t, i) => `${i + 1}. ${t}`).join("\n"));
			}
		} else {
			message.channel.send("Commands: !todo add <task>, !todo list");
		}
	}
});

client.login(process.env.DISCORD_BOT_TOKEN);
