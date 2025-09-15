import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import cron from "node-cron";

dotenv.config();

// قراءة القيم من Environment Variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// قراءة باقي الإعدادات من config.json
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();
client.xp = new Map(); // لتخزين XP مؤقتة

// ---------- الأدعية ----------
const prayers = [
    "اللهم اجعل يومنا مبارك 🌸🙏",
    "اللهم ارزقنا الخير والبركة 🌿",
    "اللهم احفظ أحبائنا من كل شر 🕊️",
    "اللهم اجعلنا من عبادك الصالحين 🌟",
    "اللهم افتح لنا أبواب رزقك 🌸",
    "اللهم اجعلنا شاكرين لنعمك 🌺",
    "اللهم ارحمنا برحمتك الواسعة 🌹",
    "اللهم اجعلنا من المتقين 🌿",
    "اللهم اجعل أيامنا فرح وسعادة 🌞",
    "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ",
    "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    "اللهم اجعل قلوبنا مطمئنة بذكرك ❤️",
    "اللهم اجعل أعمالنا مقبولة عندك 🌹",
    "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    "اللهم ارحمنا واغفر لنا ذنوبنا 🌺",
    "اللهم اجعلنا شاكرين نعمك 🌞",
    "اللهم ارفع عنا البلاء والغم 🌸",
    "اللهم ارزقنا السعادة والرضا 🌹",
    "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الهَمِّ وَالحَزَنِ، وَالعَجْزِ وَالكَسَلِ، وَالجُبْنِ وَالبُخْلِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ"
];

// ---------- Functions ----------
function saveConfig() { fs.writeFileSync("./config.json", JSON.stringify(config, null, 2)); }
function getRoleById(guild, roleId) { return guild.roles.cache.get(roleId); }
function addXP(userId, amount=10) {
    if (!client.xp.has(userId)) client.xp.set(userId, 0);
    client.xp.set(userId, client.xp.get(userId) + amount);
}

// ---------- Ready Event ----------
client.once("ready", async () => {
    console.log(`${client.user.tag} جاهز للتشغيل!`);

    // ---------- أدعية أوتوماتيكية ----------
    if (config.defaultPrayerChannel && config.prayerInterval) {
        cron.schedule(`*/${config.prayerInterval/60000} * * * *`, async () => {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;
            const channel = guild.channels.cache.get(config.defaultPrayerChannel);
            if (!channel) return;
            const prayer = prayers[Math.floor(Math.random() * prayers.length)];
            channel.send({ content: prayer });
        });
    }
});

// ---------- Interaction Handler ----------
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // ---- Button Roles ----
    if (interaction.isButton()) {
        const roleId = interaction.customId.split("_")[1];
        const role = getRoleById(interaction.guild, roleId);
        if (!role) return interaction.reply({ content: "الرول غير موجود!", ephemeral: true });
        if (interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.remove(role);
            return interaction.reply({ content: `تم إزالة الرول: ${role.name}`, ephemeral: true });
        } else {
            await interaction.member.roles.add(role);
            return interaction.reply({ content: `تم إعطائك الرول: ${role.name}`, ephemeral: true });
        }
    }

    // ---- Slash Commands ----
    const { commandName, options } = interaction;

    // --- إرسال رسالة ---
    if (commandName === "sendmessage") {
        const text = options.getString("text");
        const channel = options.getChannel("channel");
        const embedOption = options.getBoolean("embed");
        if (!channel) return interaction.reply({ content: "اختر روم صحيح.", ephemeral: true });
        if (embedOption) {
            const embed = new EmbedBuilder().setDescription(text).setColor("Random");
            channel.send({ embeds: [embed] });
        } else channel.send({ content: text });
        interaction.reply({ content: "تم إرسال الرسالة ✅", ephemeral: true });
    }

    // --- إضافة لون/رول ---
    else if (commandName === "setcolorrole") {
        const emoji = options.getString("emoji");
        const role = options.getRole("role");
        if (!emoji || !role) return interaction.reply({ content: "الرجاء تحديد إيموجي ورول صحيح.", ephemeral: true });
        config.colorRoles.push({ emoji, roleId: role.id, label: role.name });
        saveConfig();
        interaction.reply({ content: `تم إضافة اللون ${role.name} بنجاح!`, ephemeral: true });
    }

    // --- إرسال لوحة ألوان ---
    else if (commandName === "sendcolorpanel") {
        const channel = options.getChannel("channel");
        if (!channel) return interaction.reply({ content: "اختر روم صحيح.", ephemeral: true });
        if (config.colorRoles.length === 0) return interaction.reply({ content: "لا يوجد ألوان مضافة.", ephemeral: true });

        const row = new ActionRowBuilder();
        config.colorRoles.forEach(c => {
            row.addComponents(new ButtonBuilder().setCustomId(`role_${c.roleId}`).setLabel(c.label).setEmoji(c.emoji).setStyle(ButtonStyle.Primary));
        });

        const embed = new EmbedBuilder().setTitle("اختر لونك 🎨").setDescription("اضغط على الزر لأخذ الرول.").setColor("Random");
        await channel.send({ embeds: [embed], components: [row] });
        interaction.reply({ content: "تم إرسال لوحة الألوان ✅", ephemeral: true });
    }

    // --- XP أضف لكل عضو تفاعل ---
    if (interaction.isChatInputCommand() && interaction.user) addXP(interaction.user.id, 10);
});

// ---------- تسجيل السلاش كوماند ----------
client.on("ready", async () => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return console.log("لم يتم العثور على السيرفر!");

    await guild.commands.set([
        {
            name: "sendmessage",
            description: "ارسال رسالة عبر البوت",
            options: [
                { name: "text", type: 3, description: "نص الرسالة", required: true },
                { name: "channel", type: 7, description: "الروم", required: true },
                { name: "embed", type: 5, description: "امبد ام لا", required: true }
            ]
        },
        {
            name: "setcolorrole",
            description: "اضافة لون/رول",
            options: [
                { name: "emoji", type: 3, description: "الإيموجي", required: true },
                { name: "role", type: 8, description: "الرول", required: true }
            ]
        },
        {
            name: "sendcolorpanel",
            description: "ارسال لوحة ألوان للرولات",
            options: [
                { name: "channel", type: 7, description: "الروم", required: true }
            ]
        }
    ]);

    console.log("تم تسجيل السلاش كوماند ✅");
});

client.login(token);
