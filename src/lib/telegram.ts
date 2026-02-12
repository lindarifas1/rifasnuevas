const BOT_TOKEN = '8428493735:AAHj3DlgvJ7zpZ4PFUW9zzI72Rgn0cRoZy4';
const CHAT_ID = '-1003715813860';

// Prefix to identify Telegram file_ids stored in payment_proof_url
export const TELEGRAM_PREFIX = 'tg_file_id:';

export async function uploadToTelegram(file: File, caption?: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file);
    if (caption) {
      formData.append('caption', caption);
    }

    const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const sendData = await sendRes.json();
    console.log('Telegram sendDocument response:', JSON.stringify(sendData));
    
    if (!sendData.ok) {
      console.error('Telegram sendDocument error:', sendData);
      return null;
    }

    // Get permanent file_id from document
    const fileId = sendData.result.document?.file_id;
    if (!fileId) {
      console.error('No file_id in Telegram response');
      return null;
    }

    // Return the permanent file_id with prefix
    return `${TELEGRAM_PREFIX}${fileId}`;
  } catch (error) {
    console.error('Telegram upload error:', error);
    return null;
  }
}

/**
 * Given a payment_proof_url, resolves it to a viewable image URL.
 * - If it's a Telegram file_id (prefixed with tg_file_id:), fetches a fresh temporary URL.
 * - Otherwise returns the URL as-is (e.g. old Supabase URLs).
 */
export async function resolveProofUrl(paymentProofUrl: string): Promise<string | null> {
  if (!paymentProofUrl.startsWith(TELEGRAM_PREFIX)) {
    // Regular URL (Supabase or other), return as-is
    return paymentProofUrl;
  }

  const fileId = paymentProofUrl.slice(TELEGRAM_PREFIX.length);
  
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok) {
      console.error('Telegram getFile error:', fileData);
      return null;
    }

    const filePath = fileData.result.file_path;
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  } catch (error) {
    console.error('Error resolving Telegram file:', error);
    return null;
  }
}
