const BOT_TOKEN = '8428493735:AAHj3DlgvJ7zpZ4PFUW9zzI72Rgn0cRoZy4';
const CHAT_ID = '-1003715813860';

export async function uploadToTelegram(file: File, caption?: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', file);
    if (caption) {
      formData.append('caption', caption);
    }

    const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    const sendData = await sendRes.json();
    if (!sendData.ok) {
      console.error('Telegram sendPhoto error:', sendData);
      return null;
    }

    // Get the largest photo size
    const photos = sendData.result.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileId = largestPhoto.file_id;

    // Get file path
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok) {
      console.error('Telegram getFile error:', fileData);
      return null;
    }

    const filePath = fileData.result.file_path;
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  } catch (error) {
    console.error('Telegram upload error:', error);
    return null;
  }
}
