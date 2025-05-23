import { useEffect, useState } from "react";
import PropTypes from "prop-types";

function Timer( {confirm, reset, setReset, caption, setCaption} ) {
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (timer === 0 && !reset) {
      if(caption.id === -1) {
        confirm();
      } else {
        setCaption({"id": -1});
      }
      return;
    }
    if(reset) {
      setTimer(30);
      setReset(false)
    } else {
      const intervalId = setInterval(() => {setTimer(timer-1)}, 1000);
      return () => clearInterval(intervalId);
    }
  }, [timer, reset, caption])

  return(
    <h2>{timer}</h2>
  )
}

Timer.propTypes = {
  confirm: PropTypes.func,
  reset: PropTypes.bool,
  setReset: PropTypes.func,
  caption: PropTypes.object,
  setCaption: PropTypes.func,
};

export { Timer };
