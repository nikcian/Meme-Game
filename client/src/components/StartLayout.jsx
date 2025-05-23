import wdymLogo from "../assets/wdymLogo.png";
import "./StartLayout.css"
import { MatchButton } from "./MatchLayout";

export function StartLayout() {
  return (
    <>
      <div className="logo">
        <a href="/">
          <img src={wdymLogo} className="img-fluid" />
        </a>
      </div>
      <div className="my-5 play">
        <MatchButton />
      </div>
    </>
  );
}
