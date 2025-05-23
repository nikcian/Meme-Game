import { useNavigate } from "react-router-dom";
import { Button, Col, Row, Table } from "react-bootstrap";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import API from "../API.mjs";
import { Match } from "../models.mjs";

const IMAGE_URL = "http://localhost:3001/static/";

function HistoryLayout(props) {
  const [matches, setMatches] = useState([]);

  const navigate = useNavigate();

  const getHistoryMatch = async (rawMatch) => {
    const rounds = await API.getMatchFromHistory(rawMatch.historyId);
    const match = new Match(
      rawMatch.historyId,
      rounds,
      rawMatch.points,
      rawMatch.date
    );
    return match;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const rawHistory = await API.getHistory();
      let historyMatches = [];
      for (const rawMatch of rawHistory) {
        const historyMatch = await getHistoryMatch(rawMatch);
        historyMatches.push(historyMatch);
      }
      historyMatches.sort((a,b) => b.id - a.id);
      setMatches(historyMatches);
    };
    fetchHistory();
  }, []);

  return (
    <div>
      <Row>
        <Col>
          <h1>Partite di {props.user.name}</h1>
        </Col>
        <Col className='text-end'>
        <Button variant="primary" size="lg" onClick={() => navigate("/")}>
          Ritorna alla home
        </Button>
        </Col>
      </Row>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Info</th>
            <th>Round 1</th>
            <th>Round 2</th>
            <th>Round 3</th>
          </tr>
          {matches.map((match) => (
            <tr key={match.id}>
              <td key={match.date}>
                <p>Data: {match.date}</p>
                <p>Round 1: +{5 * match.rounds[0].isCorrect} Punti</p>
                <p>Round 2: +{5 * match.rounds[1].isCorrect} Punti</p>
                <p>Round 3: +{5 * match.rounds[2].isCorrect} Punti</p>
                <p>Punti Totali: {match.points}</p>
              </td>
              <td key={match.rounds[0].image.id}>
                <img
                  src={IMAGE_URL + match.rounds[0].image.path}
                  alt="Meme Image"
                  className="img-fluid"
                />
              </td>
              <td key={match.rounds[1].image.id}>
              <img
                  src={IMAGE_URL + match.rounds[1].image.path}
                  alt="Meme Image"
                  className="img-fluid"
                />
              </td>
              <td key={match.rounds[2].image.id}>
              <img
                  src={IMAGE_URL + match.rounds[2].image.path}
                  alt="Meme Image"
                  className="img-fluid"
                />
              </td>
            </tr>
          ))}
        </thead>
        <tbody></tbody>
      </Table>
    </div>
  );
}

HistoryLayout.propTypes = {
  loggedIn: PropTypes.bool,
  user: PropTypes.object,
};

function HistoryButton() {
  const navigate = useNavigate();
  return (
    <Button variant="outline-light" onClick={() => navigate("/history")}>
      History
    </Button>
  );
}

export { HistoryLayout, HistoryButton };
