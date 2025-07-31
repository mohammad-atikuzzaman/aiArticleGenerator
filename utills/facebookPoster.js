import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const fb_access_token =
  "";
const fb_page_id = "";

export async function createPublicPost(message) {
  const endpoint = `https://graph.facebook.com/v23.0/${fb_page_id}/photos?access_token=${fb_access_token}`;

  const postData = {
    message,
    url: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQjaZqoKF8yK88wv0RQrglNCHojWUuSZQt17pddpwQVVyjIqZfonSl85849PK3Es0KLxpBNx11PACke7SujhbDJTA",
  };

  const response = await axios.post(endpoint, postData, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log(response.data);
}

createPublicPost("Hello from node js, this is 31 jul 2025");
