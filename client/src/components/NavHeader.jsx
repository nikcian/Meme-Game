import { Container, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";
import { LogoutButton, LoginButton } from './Auth';
import PropTypes from "prop-types";
import { HistoryButton } from "./HistoryLayout";


function NavHeader(props) {
  return (
    <Navbar bg="info" data-bs-theme="dark">
      <Container fluid>
        <Link to="/" className="navbar-brand">
          Meme Game
        </Link>
        <span className="ml-md-auto">
          {props.loggedIn ? ( <div className="btn-group">
              <HistoryButton />
              <LogoutButton logout={props.logout} />
            </div>
          ) : (
            <LoginButton />
          )}
        </span>
      </Container>
    </Navbar>
  );
}

NavHeader.propTypes = {
  logout: PropTypes.func,
  loggedIn: PropTypes.bool
}

export default NavHeader;
