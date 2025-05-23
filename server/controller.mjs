import { Round, History } from "./models.mjs";
import MemeDAO from "./dao/memeDAO.mjs";
import dayjs from "dayjs";

const shuffle = (captions) => {
  try {
    let currentIndex = captions.length;
    let randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [captions[currentIndex], captions[randomIndex]] = [
        captions[randomIndex],
        captions[currentIndex],
      ];
    }
  } catch (err) {
    return err;
  }
};

const pick = (elements, num) => {
  try {
    if (elements.length < num) {
      throw { Error: "number of elements is too low" };
    }
    shuffle(elements);
    return [...elements].slice(0, num);
  } catch (err) {
    return err;
  }
};

//pick 2
const getCorrectCaptionsByImage = async (imageId) => {
  try {
    const correctCaptions = await MemeDAO.getCaptionsByImage(imageId);
    const pickedCaptions = pick(correctCaptions, 2);
    return pickedCaptions;
  } catch (err) {
    return (err);
  }
};

//pick 5
const getWrongCaptionsByImage = async (imageId) => {
  try {
    const allCaptions = await MemeDAO.getAllCaptions();
    const correctCaptions = await MemeDAO.getCaptionsByImage(imageId);
    const wrongCaptions = [...allCaptions].filter(
      (cpt) => !correctCaptions.map((cc) => cc.id).includes(cpt.id)
    );
    const pickedCaptions = pick(wrongCaptions, 5);
    return pickedCaptions;
  } catch (err) {
    return (err);
  }
};

const getCaptionsDeck = async (imageId) => {
  try {
    let pickedCaptions = [];
    const correctCaptions = await getCorrectCaptionsByImage(imageId);
    const wrongCaptions = await getWrongCaptionsByImage(imageId);
    pickedCaptions.push(...correctCaptions);
    pickedCaptions.push(...wrongCaptions);
    shuffle(pickedCaptions);
    return pickedCaptions;
  } catch (err) {
    return (err);
  }
};

//pick 3
const getRandomImages = async () => {
  const allImages = await MemeDAO.getAllImages();
  const pickedImages = pick(allImages, 3);
  return pickedImages;
};

const pickImage = async () => {
  const allImages = await MemeDAO.getAllImages();
  const pickedImage = pick(allImages, 1);
  return pickedImage[0];
};

const getCorrectCaptionsFromDeck = async (imageId, captionIdList) => {
  try {
    const correctCaptions = await MemeDAO.getCaptionsByImage(imageId);
    const solution = [...captionIdList].filter(
      (ci) => correctCaptions.map((cc) => cc.id).includes(ci)
    );
    if (solution.length < 2) {
      throw {error: 'Not enough correct captions'};
    }
    return (solution);
  } catch (err) {
    return (err);
  }

};

const saveMatch = async (userId, matchRounds) => {
  const now = dayjs().format('DD/MM/YYYY');
  const rounds = matchRounds.map(
    (round) => new Round(round.imageId, round.isCorrect)
  );
  const history = new History(rounds, now);
  await MemeDAO.saveHistory(userId, history);
};

const getHistoryPreview = async (userId) => {
  const historyList = await MemeDAO.getHistoryList(userId);
  return(historyList);
}

const getHistoryMatch = async (historyId) => {
  try {
    const historyMatch = await MemeDAO.getHistoryElement(historyId);
    let details = [];
    for (const round of historyMatch){
      const image = await MemeDAO.getImageById(round.imageId);
      details.push({"imageId": image.id, "path": image.path, "isCorrect": round.isCorrect});
    }
    return (details);
  } catch (err) {
    return(err);
  }
}

const Controller = {
  getRandomImages,
  getCaptionsDeck,
  saveMatch,
  getCorrectCaptionsFromDeck,
  getHistoryPreview,
  getHistoryMatch,
  pickImage,
};
export default Controller;
