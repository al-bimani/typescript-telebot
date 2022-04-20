import dotenv from 'dotenv';

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram';
import input from 'input';
import { Canvas, Image } from 'canvas';
import Konva from 'konva/cmj';
import Vibrant from 'node-vibrant';

dotenv.config();

const prefix = '-';
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION); // fill this later with the value from session.save()

(async () => {
  console.log('Loading interactive example...');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await login(client);

  client.addEventHandler(
    handleOutgoingMessage,
    new NewMessage({
      outgoing: true,
      incoming: false,
    }),
  );
})();

async function handleOutgoingMessage(event: NewMessageEvent): Promise<void> {
  const client = event.client;
  const content = event.message.message;
  const chat = (await event.message.getInputChat()) as Api.Chat; // event.message._inputChat

  if (!content?.startsWith(prefix)) return;

  const [command, ...args] = content.slice(prefix.length).split(/ +/g);

  if (command === 'spam') {
    const times = parseInt(args[0]);
    const contentFixed = content
      .slice(prefix.length)
      .trim()
      .slice(command.length)
      .trim()
      .slice(args[0]?.length)
      .trim();

    for (let i = 0; i < times; i++) {
      await client.sendMessage(chat, { message: contentFixed });
    }
  }

  if (command === 'welcome') {
    const W = 1024,
      H = 330;
    const mentions = content.match(/\B@\w+/gim);
    const buffer = (await client.downloadProfilePhoto(mentions[0])) as Buffer;

    const avatar = new Image();
    avatar.src = buffer;

    const palette = await Vibrant.from(buffer).getPalette();

    const stage = new Konva.Stage({
      width: W,
      height: H,
      container: undefined,
    });

    const layer = new Konva.Layer();
    const bgGroup = new Konva.Group({
      shadowColor: 'white',
      width: W,
      height: H,
    });
    const avatarBackground = new Konva.Image({
      x: -W / 3,
      y: -W * 0.6,
      // @ts-ignore
      image: avatar,
      width: W * 1.6,
      blurRadius: 70,
      height: W * 1.6,
    });
    avatarBackground.cache();
    avatarBackground.filters([Konva.Filters.Blur]);
    const border = new Konva.Rect({
      x: 0,
      y: 0,
      width: W,
      height: H,
      stroke: palette.LightVibrant.getHex(),
      strokeWidth: 20,
    });
    bgGroup.add(avatarBackground);
    bgGroup.add(border);
    layer.add(bgGroup);
    const avatarWithMask = new Konva.Layer();
    const featherMask = new Konva.Circle({
      x: H / 2,
      y: H / 2,
      radius: H / 2,
      fillRadialGradientStartPoint: { x: 0, y: 0 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: 0, y: 0 },
      fillRadialGradientEndRadius: H / 2,
      fillRadialGradientColorStops: [
        0,
        palette.DarkVibrant.getHex(),
        0.3,
        palette.DarkVibrant.getHex(),
        1,
        'transparent',
      ],
    });
    const avatarShow = new Konva.Image({
      x: 0,
      y: 0,
      width: H,
      height: H,
      // @ts-ignore
      image: avatar,
      globalCompositeOperation: 'source-in',
    });
    avatarWithMask.add(featherMask);
    avatarWithMask.add(avatarShow);
    const welcomeMessageP1 = new Konva.Text({
      x: W / 3 + 40,
      y: H - 100,
      text: 'Welcome'.toUpperCase(),
      fontSize: 40,
      fontFamily: 'TheBoldFont, Arial, sans-serif',
      fill: '#FFF',
      shadowColor: '#000',
      shadowBlur: 7,
      shadowOpacity: 0.6,
    });
    const welcomeMessageP2 = new Konva.Text({
      x: W / 3 + 70,
      y: H - 50,
      text: 'to Seksen Dört'.toUpperCase(),
      fontSize: 30,
      fontFamily: 'TheBoldFont, Arial, sans-serif',
      fill: '#FFF',
      shadowColor: '#000',
      shadowBlur: 7,
      shadowOpacity: 0.6,
    });
    const usernameText = new Konva.Text({
      x: W / 2.6,
      y: 70,
      width: 500,
      align: 'center',
      text: mentions[0],
      fontSize: 40,
      fontFamily: 'Arial, sans-serif',
      fill: '#FFF',
      shadowColor: '#000',
      shadowBlur: 7,
      shadowOpacity: 0.6,
      ellipsis: true,
      wrap: 'none',
    });

    layer.add(welcomeMessageP1);
    layer.add(welcomeMessageP2);
    layer.add(usernameText);

    stage.add(layer);
    stage.add(avatarWithMask);
    layer.draw();

    // @ts-ignore
    const cvs = stage.toCanvas() as Canvas;
    const buff = cvs.toBuffer('image/png');
    // @ts-ignore
    buff.name = 'welcome.png';

    await client.sendMessage(chat, {
      message: `**Hello, ${mentions[0]}; Welcome!**`,
      file: buff,
    });
  } // -welcome @ahlinz
}

async function login(client: TelegramClient): Promise<void> {
  await client.start({
    phoneNumber: async () => await input.text('Please enter your number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () => await input.text('Please enter the code you received: '),
    onError: (err) => console.log(err),
  });
  console.log('You should now be connected.');
  if (!process.env.SESSION) console.log(client.session.save()); // Save this string to avoid logging in again
}
