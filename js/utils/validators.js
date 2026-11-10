const readNumber = (id, label) => {
  const value = document.getElementById(id).value.trim();

  if (value === "") {
    throw new Error(`Inserisci un valore per: ${label}.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Il valore di "${label}" non è valido.`);
  }

  return number;
};

export function readSimulationInputs() {
  const values = {
    price: readNumber("price", "Prezzo immobile"),
    down: readNumber("down", "Anticipo iniziale"),
    reno: readNumber("reno", "Ristrutturazione"),
    years: readNumber("years", "Durata mutuo"),
    rate: readNumber("rate", "Tasso mutuo"),
    agency: readNumber("agency", "Agenzia immobiliare"),
    notary: readNumber("notary", "Notaio"),
    imu: readNumber("imu", "IMU annuale"),
    condo: readNumber("condo", "Spese condominiali"),
    maint: readNumber("maint", "Manutenzione annua"),
    growth: readNumber("growth", "Rivalutazione immobile"),
    invest: readNumber("invest", "Rendimento investimento"),
    infl: readNumber("infl", "Inflazione"),
    horizon: readNumber("horizon", "Orizzonte simulazione")
  };

  if (values.price <= 0) {
    throw new Error("Il prezzo dell'immobile deve essere maggiore di zero.");
  }
  if (values.down < 0 || values.down > values.price) {
    throw new Error("L'anticipo deve essere compreso tra zero e il prezzo dell'immobile.");
  }
  if (!Number.isInteger(values.years) || values.years <= 0) {
    throw new Error("La durata del mutuo deve essere un numero intero positivo.");
  }
  if (!Number.isInteger(values.horizon) || values.horizon <= 0) {
    throw new Error("L'orizzonte della simulazione deve essere un numero intero positivo.");
  }

  const nonNegativeFields = ["reno", "rate", "agency", "notary", "imu", "condo", "maint"];
  for (const field of nonNegativeFields) {
    if (values[field] < 0) {
      throw new Error("I costi e il tasso del mutuo non possono essere negativi.");
    }
  }

  for (const field of ["growth", "invest", "infl"]) {
    if (values[field] <= -100) {
      throw new Error("I tassi di crescita, rendimento e inflazione devono essere superiori a -100%.");
    }
  }

  return values;
}
