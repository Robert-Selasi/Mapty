"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const formEdit = document.querySelector(".form__edit");
const inputEditType = document.querySelector(".form_edit__input--type");
const inputEditDistance = document.querySelector(".form_edit__input--distance");
const inputEditDuration = document.querySelector(".form_edit__input--duration");
const inputEditCadence = document.querySelector(".form_edit__input--cadence");
const inputEditElevation = document.querySelector(
  ".form_edit__input--elevation"
);

const error = document.querySelector(".error");
const success = document.querySelector(".success");

class Workout {
  date = new Date();
  id = `${Date.now()}`.slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //km
    this.duration = duration; // min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }
  _calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this._calcSpeed();
    this._setDescription();
  }
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #markers = [];
  isFormActive = false;
  editWorkoutEl;
  editWorkout;

  constructor() {
    // get position of user
    this._getPosition();
    // get data from local storage
    this._getLocalStorage();
    // attach event handlers
    inputType.addEventListener("change", this._toggleElevationField);
    inputEditType.addEventListener("change", this._toggleEditElevationField);
    form.addEventListener("submit", this._newWorkout.bind(this));
    formEdit.addEventListener("submit", this._editFormSubmit.bind(this));
    containerWorkouts.addEventListener(
      "click",
      this._workoutOnClick.bind(this)
    );

    if (this.#workouts.length > 1) {
      this._renderDeleteAndSortContainer();
      const deleteAll = document.querySelector(".delete-button");
      const sortEl = document.querySelector(".sort-select");
      const showMarkers = document.querySelector(".showAllMarkers");
      deleteAll.addEventListener("click", this._deleteAllWorkout.bind(this));
      sortEl.addEventListener("change", this._sortWorkout.bind(this));
      showMarkers.addEventListener("click", this._showAllMarkers.bind(this));
    }
  }
  _getPosition() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function (error) {
          let html = `<div id="errorMessage" class="error">
              Error: ${error.code} : ${error.message}
            </div>`;
          containerWorkouts.insertAdjacentHTML("afterbegin", html);
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map("map").setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer(
      "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=11bcc504bcf74f54ab91205942e5e04e",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.#map);

    // render marker on page load
    this.#workouts.forEach((workout) => {
      this._renderWorkoutMarker(workout);
    });
    // click event handling on map
    this.#map.on("click", this._showForm.bind(this));
  }
  _showForm(mapE) {
    if (!this.isFormActive) {
      this.#mapEvent = mapE;
      form.classList.remove("hidden");
      inputDistance.focus();
      this.isFormActive = true;
    }
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(function () {
      form.style.display = "grid";
    }, 1000);
    this.isFormActive = false;
  }

  _hideEditForm() {
    inputEditDistance.value =
      inputEditDuration.value =
      inputEditElevation.value =
      inputEditCadence.value =
        "";

    formEdit.style.display = "none";
    formEdit.classList.add("hidden");
    setTimeout(function () {
      formEdit.style.display = "grid";
    }, 1000);
    this.isFormActive = false;
  }

  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();
    const validateInput = (...values) =>
      values.every((val) => Number.isFinite(val));
    const isPositiveInput = (...values) => values.every((val) => val > 0);

    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      // check if inputs are valid
      if (
        !validateInput(distance, duration, elevation) ||
        !isPositiveInput(distance, duration)
      ) {
        this._renderErrorMessage();
        return;
      }
      workout = new Cycling(coords, distance, duration, elevation);
    }

    if (type === "running") {
      const cadence = +inputCadence.value;
      // check if inputs are valid
      if (
        !validateInput(distance, duration, cadence) ||
        !isPositiveInput(distance, duration, cadence)
      ) {
        this._renderErrorMessage();
        return;
      }
      workout = new Running(coords, distance, duration, cadence);
    }
    this._renderSuccessMessage();
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this.#workouts.push(workout);

    // clear fields
    this._hideForm();

    // set local storage
    this._setLocalStorage();
    if (this.#workouts.length > 1) {
      this._renderDeleteAndSortContainer();
    }
  }

  _renderSuccessMessage() {
    success.style.display = "block";
    setTimeout(function () {
      success.style.display = "none";
    }, 2000);
  }
  _renderErrorMessage() {
    error.style.display = "block";
    setTimeout(function () {
      error.style.display = "none";
    }, 2000);
  }
  _renderWorkoutMarker(workout) {
    // const { lat, lng } = this.#mapEvent.latlng;
    const marker = L.marker(workout.coords);
    marker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }).setContent(
          `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
        )
      )
      .openPopup();
    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__toggles toggle--hidden"> 
          <a href="#"  class="workout__toggle_btn toggle__btn-Edit" data-type ="edit">Edit</a>
          <a  href="#" class="workout__toggle_btn toggle__btn-Delete" data-type="delete">Delete</a>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === "running") {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          
        </li>
      `;
    }

    if (workout.type === "cycling") {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> `;
    }

    form.insertAdjacentHTML("afterend", html);
  }
  _workoutOnClick(e) {
    if (!this.#map) return;
    let workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    this.editWorkout = workout;
    this.editWorkoutEl = workoutEl;

    const index = this.#workouts.findIndex(
      (work) => work.id === workoutEl.dataset.id
    );

    this._moveToPopUp.call(this, workout);

    // working on deleting workout
    if (e.target.dataset.type === "delete") {
      this._deleteWorkout.call(this, workoutEl);
    }
    ///////////////////////// editing form /////////////////
    if (e.target.dataset.type === "edit") {
      this._showEditForm.call(this, workout);
    }
  }

  _showEditForm(workout) {
    if (this.isFormActive) return;

    formEdit.classList.remove("hidden");
    inputEditDistance.value = workout.distance;
    inputEditDuration.value = workout.duration;
    inputEditType.value = workout.type;
    inputEditType.disabled = true;
    this._toggleEditElevationField();
    if (workout.type === "cycling") {
      inputEditElevation.value = workout.elevation;
    }

    if (workout.type === "running") {
      inputEditCadence.value = workout.cadence;
    }
    inputEditDistance.focus();
    this.isFormActive = true;
  }

  _toggleEditElevationField() {
    const type = inputEditType.value;
    if (type === "running") {
      //   // toggle select input to type
      inputEditCadence
        .closest(".form_edit__row")
        .classList.remove("form_edit__row--hidden");
      inputEditElevation
        .closest(".form_edit__row")
        .classList.add("form_edit__row--hidden");
    }
    if (type === "cycling") {
      // toggle select input to type
      inputEditType.value = "cycling";
      inputEditCadence
        .closest(".form_edit__row")
        .classList.add("form_edit__row--hidden");
      inputEditElevation
        .closest(".form_edit__row")
        .classList.remove("form_edit__row--hidden");
    }
  }

  _editFormSubmit(e) {
    e.preventDefault();
    const validateInput = (...values) =>
      values.every((val) => Number.isFinite(val));
    const isPositiveInput = (...values) => values.every((val) => val > 0);

    const type = inputEditType.value;
    const distance = +inputEditDistance.value;
    const duration = +inputEditDuration.value;

    if (type === "cycling") {
      const elevation = +inputEditElevation.value;
      // check if inputs are valid
      if (
        !validateInput(distance, duration, elevation) ||
        !isPositiveInput(distance, duration)
      ) {
        this._renderErrorMessage();
        return;
      }
      this.editWorkout.distance = distance;
      this.editWorkout.duration = duration;
      this.editWorkout.elevation = elevation;
    }

    if (type === "running") {
      const cadence = +inputEditCadence.value;
      // check if inputs are valid
      if (
        !validateInput(distance, duration, cadence) ||
        !isPositiveInput(distance, duration, cadence)
      ) {
        this._renderErrorMessage();
        return;
      }
      this.editWorkout.distance = distance;
      this.editWorkout.duration = duration;
      this.editWorkout.elevation = elevation;
    }

    // clear fields
    this._hideEditForm();
    this._renderSuccessMessage();

    let html = `
          
          <h2 class="workout__title">${this.editWorkout.description}</h2>
          <div class="workout__toggles toggle--hidden"> 
          <a href="#"  class="workout__toggle_btn toggle__btn-Edit" data-type ="edit">Edit</a>
          <a  href="#" class="workout__toggle_btn toggle__btn-Delete" data-type="delete">Delete</a>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              this.editWorkout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${this.editWorkout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${this.editWorkout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (this.editWorkout.type === "running") {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${this.editWorkout.pace.toFixed(
              1
            )}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${this.editWorkout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
      `;
    }

    if (this.editWorkout.type === "cycling") {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${this.editWorkout.speed.toFixed(
              1
            )}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${this.editWorkout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>`;
      this.editWorkoutEl.innerHTML = html;
    }

    // set local storage
    this._setLocalStorage();
  }

  _deleteWorkout(workoutEl) {
    // finding the index of a workout
    const index = this.#workouts.findIndex(
      (work) => work.id === workoutEl.dataset.id
    );
    // remove workout element from DOM
    workoutEl.remove();
    // remove workout object from workouts Array
    this.#workouts.splice(index, 1);
    // remove marker from map
    this.#map.removeLayer(this.#markers[index]);
    this.#markers.splice(index, 1);

    // reset Local storage
    this._setLocalStorage();
  }

  _moveToPopUp(workout) {
    // const workout = this.#workouts.find(
    //   (work) => work.id === workoutEl.dataset.id
    // );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    // localStorage.setItem("workouts", `${JSON.stringify(this.#workouts)}`);
    // console.log(this.#workouts);
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    data.forEach((obj) => {
      obj.prototype = Workout.prototype;
      this.#workouts.push(obj);
    });
    // this.#workouts = data;
    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }

  _resetStorage() {
    localStorage.removeItem("workouts");
    location.reload();
  }

  _renderDeleteAndSortContainer() {
    document.querySelector(".container").style.display = "flex";
  }

  _deleteAllWorkout() {
    this.#workouts = [];
    this._resetStorage();
    this.#markers = [];
    location.reload();
  }

  _sortFunc(sortby) {
    console.log(this.#workouts);
    this.#workouts.sort((a, b) => b[sortby] - a[sortby]);
    containerWorkouts.querySelectorAll(".workout").forEach((el) => el.remove());
    this.#workouts.forEach((work) => this._renderWorkout(work));
    // this._setLocalStorage();
  }

  _sortWorkout() {
    const value = document.querySelector(".sort-select").value;
    if (value === "default") return;
    if (value === "distance") this._sortFunc(value);
    if (value === "duration") this._sortFunc(value);
  }

  _showAllMarkers() {
    const group = new L.featureGroup(this.#markers);
    this.#map.fitBounds(group.getBounds());
  }
}

const app = new App();
// localStorage.removeItem("workouts");
