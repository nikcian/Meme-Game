import { useNavigate } from "react-router-dom";
import { Button, Col, Container, ListGroup, Row, Card } from "react-bootstrap";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import API from "../API.mjs";
import { Meme } from "../models.mjs";
import { Timer } from "./Timer";

const IMAGE_URL = "http://localhost:3001/static/";

function MatchLayout(props) {
  const [currentRound, setCurrentRound] = useState(1);
  const [results, setResults] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [captions, setCaptions] = useState([]);

  const navigate = useNavigate();

  const fetchCaptions = (imageId) => {
    API.getCaptionsByImage(imageId).then((cptl) => setCaptions(cptl));
  };

  const fetchSaveRounds = (matchResults) => {
    const rounds = matchResults.map((result) => {return({"imageId": result.image.id, "isCorrect": result.isCorrect});});
    API.saveMatch(rounds);
  }

  useEffect(() => {
    const fetchImages = async () => {
      const images = await API.getImages();
      setImages(images);
      fetchCaptions(images[0].id);
      setLoading(false);
    };
    const fetchImage = async () => {
      const image = await API.pickImage();
      setImages([image]);
      fetchCaptions(image.id);
      setLoading(false);
    };
    if (loading) {
      if(props.loggedIn) {
        fetchImages();
      } else {
        fetchImage();
      }
    }
  }, []);

  const handleResult = (result) => {
    if(!props.loggedIn) {
      navigate("/")
    } else {
      const tempResults = [...results, result]
      setResults(tempResults);
      if (currentRound < 3) {
        fetchCaptions(images[currentRound].id);
      } else {
        fetchSaveRounds(tempResults);
        setLoading(true);
        setImages([]);
      }
      setCurrentRound(currentRound + 1);
    }
  };
  
  
  if (loading && currentRound <= 3) {
    return <div>Loading match...</div>;
  }

  return (
    <div>
      {currentRound <= 3 ? ( 
        <>
          <h1>Round {currentRound}</h1>
          <Round
            round={currentRound}
            handleResult={handleResult}
            image={images[currentRound - 1]}
            captions={captions}
            loggedIn={props.loggedIn}
          />
        </>
      ) : (
        <Row>
          <Col>
            <h1>Riepilogo</h1>
          </Col>
          <Col className='text-end'>
            <Button variant="primary" size="lg" onClick={() => navigate("/")}>
              Ritorna alla home
            </Button>
          </Col>
          <Summary results={results} />
        </Row>
      )}
    </div>
  );

}

MatchLayout.propTypes = {
  loggedIn: PropTypes.bool
};

function Round({ handleResult, image, captions, loggedIn, round}) {
  const [selectedCaption, setSelectedCaption] = useState({});
  const [correctCaptions, setCorrectCaptions] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [resetTimer, setResetTimer] = useState(false);

  const confirmCaption = () => {
    const captionIds = captions.map((cpt) => cpt.id);
    API.searchCorrectCaptions(image.id, captionIds)
      .then((ccl) => {
        setCorrectCaptions(ccl);
        return ccl;
      })
      .then((ccl) => {
        setIsCorrect(ccl.includes(selectedCaption.id));
        setIsConfirmed(true);
      });
  };

  const submitResult = () => {
    setIsConfirmed(false);
    const result = new Meme(image, selectedCaption, isCorrect);
    handleResult(result);
    setSelectedCaption({});
    setResetTimer(true);
  };

  return (
    <Container fluid>
      <Row>
        <Col md={4}>
          <img
            src={IMAGE_URL + image.path}
            alt="Meme Image"
            className="img-fluid"
          />
        </Col>
        <Col md={7}>
          <h3>Seleziona una frase:</h3>
          <ListGroup>
            {captions.map((caption) => (
              <ListGroup.Item
                key={caption.id}
                className={`list-group-item ${
                  !isConfirmed
                    ? selectedCaption.id === caption.id
                      ? "active"
                      : ""
                    : ""
                }`}
                onClick={() =>
                  !isConfirmed ? setSelectedCaption(caption) : ""
                }
                style={{ cursor: "pointer" }}
                variant={`${
                  isConfirmed ? (isCorrect ? (selectedCaption.id === caption.id ? "success" : "")
                      : (selectedCaption.id === caption.id ? "danger" : (
                        correctCaptions.includes(caption.id) ? "warning" :""
                      ))) : ""
                }`}
              >
                {caption.text}
              </ListGroup.Item>
            ))}
          </ListGroup>

          <div className="mt-4">
            {isConfirmed ? (
              <Button variant="primary" onClick={submitResult}>{loggedIn&&round<3 ? "Prossimo Round" : "Concludi la partita"}</Button>
            ) : (
              <Button variant="info" onClick={confirmCaption}>Conferma</Button>
            )}
          </div>

          {isConfirmed && (
            <div className="mt-3">
              {selectedCaption.id === -1 ? <h3>Tempo scaduto</h3> :
              <h4>Risposta {isCorrect ? "corretta" : "sbagliata"}</h4>}
              <h4>Hai guadagnato: </h4>
              <h5>+{5*isCorrect} Punti</h5>
            </div>
          )}

        </Col>
        <Col  md={1} className='text-center'>
          {!isConfirmed ? (<>
            <h6>Tempo rimasto:</h6>
            <Timer confirm={confirmCaption} reset={resetTimer} setReset={setResetTimer} caption={selectedCaption} setCaption={setSelectedCaption} />
          </>) : <h2>Fine Round</h2>}
        </Col>
      </Row>
    </Container>
  );
}

Round.propTypes = {
  round: PropTypes.number,
  handleResult: PropTypes.func,
  image: PropTypes.object,
  captions: PropTypes.array,
  loggedIn: PropTypes.bool,
};

function Summary({results}) {
  return (
    <div>
      {results.filter((res) => res.isCorrect).length > 0 ? 
        (
          <h4>Hai indovinato {results.filter((res) => res.isCorrect).length} meme ({5*results.filter((res) => res.isCorrect).length} Punti) </h4>
        ) : (
          <h4>Non hai indovinato nessun meme (0 Punti)</h4>
        )}
      <Row>
        {results.filter((res) => res.isCorrect).map((result) => (
          <Col key={result.image.id} md={3}>
            <Card style={{ width: '18rem' }}>
              <Card.Img variant="top" src={IMAGE_URL + result.image.path} />
              <Card.Body>
                <Card.Title>Round {1+results.findIndex((r) => r == result)} ➔ +5 Punti</Card.Title>
                <Card.Text>
                  {result.caption.text}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

Summary.propTypes = {
  results: PropTypes.array,
}

function MatchButton() {
  const navigate = useNavigate();
  return (
    <Button variant="warning" size="lg" onClick={() => navigate("/match")}>
      PLAY GAME
    </Button>
  );
}

export { MatchLayout, MatchButton };
