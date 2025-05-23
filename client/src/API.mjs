import { Caption, Image, Round } from "./models.mjs";

const SERVER_URL = "http://localhost:3001/api";

function handleInvalidResponse(response) {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  let type = response.headers.get("Content-Type");
  if (type !== null && type.indexOf("application/json") === -1) {
    throw new TypeError(`Expected JSON, got ${type}`);
  }
  return response;
}

function apiToImage(apiImage) {
  return new Image(apiImage.id, apiImage.path);
}

function mapApiToImages(apiImages) {
  return apiImages.map((image) => new Image(image.id, image.path));
}

function mapApiToCaption(apiCaptions) {
  return apiCaptions.map((caption) => new Caption(caption.id, caption.text));
}

function mapApiToRounds(apiRounds) {
  return apiRounds.map((round) => {
    const img = new Image(round.imageId, round.path);
    return new Round(img, round.isCorrect);
  })
}

const logIn = async (credentials) => {
  return await fetch(SERVER_URL + "/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  })
    .then(handleInvalidResponse)
    .then((response) => response.json());
};

const getUserInfo = async () => {
  return await fetch(SERVER_URL + "/sessions/current", {
    credentials: "include",
  })
    .then(handleInvalidResponse)
    .then((response) => response.json());
};

const logOut = async () => {
  return await fetch(SERVER_URL + "/sessions/current", {
    method: "DELETE",
    credentials: "include",
  }).then(handleInvalidResponse);
};

const pickImage = async () => {
  const image = await fetch(SERVER_URL + "/images/pick")
    .then(handleInvalidResponse)
    .then((response) => response.json())
    .then(apiToImage);

  return image;
};

const getImages = async () => {
  const images = await fetch(SERVER_URL + "/images", {
    credentials: "include",
  })
    .then(handleInvalidResponse)
    .then((response) => response.json())
    .then(mapApiToImages);

  return images;
};

const getCaptionsByImage = async (imageId) => {
  const captions = await fetch(SERVER_URL + `/images/${imageId}/captions`)
    .then(handleInvalidResponse)
    .then((response) => response.json())
    .then(mapApiToCaption);

  return captions;
};

const searchCorrectCaptions = async (imageId, captionIds) => {
  return await fetch(SERVER_URL + `/images/${imageId}/captions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(captionIds),
  })
    .then(handleInvalidResponse)
    .then((response) => response.json());
};

const saveMatch = async (rounds) => {
  return await fetch(SERVER_URL + `/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(rounds),
  })
    .then(handleInvalidResponse);
};

const getHistory = async () => {
  return await fetch(SERVER_URL + `/history`, {
    credentials: "include",
  })
    .then(handleInvalidResponse)
    .then((response) => response.json());
};

const getMatchFromHistory = async (historyId) => {
  return await fetch(SERVER_URL + `/history/${historyId}`, {
    credentials: "include",
  })
    .then(handleInvalidResponse)
    .then((response) => response.json())
    .then(mapApiToRounds);
};

const API = {
  logIn,
  logOut,
  getUserInfo,
  pickImage,
  getImages,
  getCaptionsByImage,
  searchCorrectCaptions,
  saveMatch,
  getHistory,
  getMatchFromHistory,
};
export default API;
