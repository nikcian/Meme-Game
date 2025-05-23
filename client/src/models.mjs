function Image(id, path) {
    this.id = id;
    this.path = path;
}

function Caption(id, text) {
    this.id = id;
    this.text = text;
}

function Meme(image, caption, isCorrect) {
    this.image = image;
    this.caption = caption;
    this.isCorrect = isCorrect;
}

function Round(image, isCorrect) {
    this.image = image;
    this.isCorrect = isCorrect;
}

function Match(id, rounds, points, date) {
    this.id = id;
    this.rounds = rounds;
    this.points = points;
    this.date = date;
}

export { Image, Caption, Meme, Round, Match };