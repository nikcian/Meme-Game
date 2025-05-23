function Image(id, path) {
    this.id = id;
    this.path = path;
}

function Caption(id, text) {
    this.id = id;
    this.text = text;
}

function Meme(image, caption) {
    this.image = image;
    this.caption = caption;
}

function Round(imageId, isCorrect) {
    this.imageId = imageId;
    this.isCorrect = isCorrect;
}

function History(rounds, date) {
    this.rounds = rounds;
    this.points = [...rounds].filter(c => c.isCorrect==true).length * 5;
    this.date = date;
}

export { Image, Caption, Meme, Round, History };