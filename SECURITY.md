# Sicurezza

## Segnalare una vulnerabilità

Non aprire una issue pubblica. Usa la segnalazione privata di GitHub:
**Security → Report a vulnerability** in questo repository. Indica i passi per riprodurre il problema
e, se puoi, l'impatto previsto. Riceverai una risposta il prima possibile.

## Misure adottate

Il dettaglio è nella sezione [Sicurezza del README](README.md#sicurezza). In breve:

- partite gestite interamente dal server: il client non può inviare punteggi né conoscere le risposte in anticipo;
- password con scrypt (parametri OWASP), sessioni rigenerate al login, cookie `HttpOnly` e `SameSite=Strict`;
- protezione CSRF con Fetch Metadata e controllo dell'origine, rate limiting su login, registrazione e partite;
- Content-Security-Policy restrittiva e header di sicurezza con Helmet;
- dipendenze minime, installate senza script, con quarantena di 7 giorni e firme verificate (`npm run security`).
