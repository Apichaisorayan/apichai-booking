import { Hono } from 'hono';

const images = new Hono();

// Upload image to ImgBB
images.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image');

    if (!image) {
      return c.json({ success: false, error: 'No image provided' }, 400);
    }

    // Convert to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Upload to ImgBB
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', base64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${c.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: imgbbFormData,
    });

    const result = await response.json();

    if (!result.success) {
      return c.json({ success: false, error: 'Upload failed' }, 500);
    }

    return c.json({
      success: true,
      data: {
        url: result.data.url,
        display_url: result.data.display_url,
        delete_url: result.data.delete_url,
        thumb: result.data.thumb,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default images;
