const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const daysInMonthArr = [];

// Loop through each month of the current year 
// and append the number of days to the array
for (let month = 0; month < 12; month++) {
  const days = new Date(currentYear, month + 1, 0).getDate();
  daysInMonthArr.push(days);
}

// Create svgs day boxes for each month
for (let i = 0; i < daysInMonthArr.length; i++) {

  // Get the element with the heatmap-id="0"
  const heatmapElement = document.querySelector(`[heatmap-id="${i}"]`);

  console.log(daysInMonthArr);
  console.log(heatmapElement);

  for (let j = 0; j < daysInMonthArr[i]; j++) {
      // Create the elements using the createElement() method
      const dayBoxContainer = document.createElement('div');
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      
      // Add the classes and attributes to the elements
      dayBoxContainer.classList.add('dayBoxContainer');
      svgElement.classList.add('dayBox', 'grayBox');
      rectElement.classList.add('fill-current');
      rectElement.setAttribute('width', '100%');
      rectElement.setAttribute('height', '100%');
      

      svgElement.setAttribute("daybox-id", j);
      const popup = document.createElement('div');
      popup.classList.add('popup-content');
      popup.setAttribute("popup-id", j)

      // Hide the popup span initially
      popup.style.display = 'none';

      // Add mouse enter listener to show the popup span
      svgElement.addEventListener('mouseenter', () => {
        popup.style.display = 'inline';
      });

      // Add mouse leave listener to hide the popup span
      svgElement.addEventListener('mouseleave', () => {
        popup.style.display = 'none';
      });

      // Append the elements to each other
      svgElement.appendChild(rectElement);
      dayBoxContainer.appendChild(svgElement);
      svgElement.insertAdjacentElement('afterend', popup);

      heatmapElement.appendChild(dayBoxContainer);
  }
}


/* Chess.com API Logic */
async function fetchData(user) {

  // clear out previous data
  const monthDaySquaresPrev = document.querySelectorAll('.dayBox');
  console.log(monthDaySquaresPrev);
  monthDaySquaresPrev.forEach((node) => {
    node.classList.remove("greenBox");
    // check if grayBox is not present and add it
    if (!node.classList.contains("grayBox")) {
      node.classList.add("grayBox");
    }
  });

  // Each month has an array of day metadata objects
  let monthDayMetaArr = [];
  for (let i = 0; i < daysInMonthArr.length; i++) {
    let temp = [];
    for (let j = 0; j < daysInMonthArr[i]; j++) {
      let monthDayMeta = {
        day: j,
        wins: 0,
        losses: 0,
        draws: 0
      }
      temp.push(monthDayMeta);
    }
    monthDayMetaArr.push(temp);
  }

  user = user.toLowerCase();
  const year = "2022";

  // Query the chesscom API and create an array of promises
  const baseUrl = `https://api.chess.com/pub/player/${user}/games/${year}/`;
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  for (const [index, month] of months.entries()) {
    const url = baseUrl + month + '/pgn';
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.text();

      console.log("Sending request for month with index: ", index);
      console.log("monthDayMeta for month index: ", monthDayMetaArr[index])
      console.log("--------")


      const pgns = data.split('\n\n\n');
      // iterate over the pgn annotations
      for (let i = 0; i < pgns.length; i++) {
        const currPgn = pgns[i];
        const annotationRegex = /\[(\w+)\s+\"(.+?)\"\]/g;
        const annotations = {};
        let match;

        /* 
        Process the PGN string using the exec() method of the annotationRegex. 
        Each time the loop executes, it finds the next match 
        in the string and assigns it to the match variable. 
        The loop continues as long as match is not null. 
        */
        while ((match = annotationRegex.exec(currPgn)) !== null) {
          /* 
          Extract the key and value of the annotation 
          from the match variable using match[1] and match[2], respectively. 
          It then assigns the value to a property of the annotations object 
          with the key as the property name. 
          */
          annotations[match[1]] = match[2];
        }
        console.log("annotations: ", annotations);

        // If these specific annotations aren't found on the pgn, skip
        if (!annotations.hasOwnProperty('Black')
          || !annotations.hasOwnProperty('White')
          || !annotations.hasOwnProperty('Date')
          || !annotations.hasOwnProperty('Result')) {
          console.log("Needed annotations not found on current PGN");
          continue;
        }

        // Lowercase the player names
        annotations.Black = annotations.Black.toLowerCase()
        annotations.White = annotations.White.toLowerCase()

        // Extract day integer from the date property
        // There may be many matches on the same day
        // So, we use that as the index
        // We subtract 1 because the array is 0-indexed
        const day = parseInt(annotations.Date.split('.')[2]) - 1;

        // update meta
        if (annotations.Black === user && annotations.Result === "0-1") {
          monthDayMetaArr[index][day].wins += 1
        }
        if (annotations.Black === user && annotations.Result === "1-0") {
          monthDayMetaArr[index][day].losses += 1
        }
        if (annotations.White === user && annotations.Result === "1-0") {
          monthDayMetaArr[index][day].wins += 1
        }
        if (annotations.White === user && annotations.Result === "0-1") {
          monthDayMetaArr[index][day].losses += 1
        }
        if (annotations.Result === "1/2-1/2") {
          monthDayMetaArr[index][day].draws += 1
        }
      }

      // Get current month's heatmap
      const heatmapElement = document.querySelector(`[heatmap-id="${index}"]`);

      // Select all elements with the class name ".dayBox" within the heatmapElement
      const monthDaySquares = heatmapElement.querySelectorAll('.dayBox');
      // update squares
      for (let i = 0; i < monthDayMetaArr[index].length; i++) {
        if (monthDayMetaArr[index][i].wins + monthDayMetaArr[index][i].losses + monthDayMetaArr[index][i].draws > 0) {
          monthDaySquares[i].classList.remove("grayBox");
          monthDaySquares[i].classList.add("greenBox");

          // update popup content
          const popup = heatmapElement.querySelector(`[popup-id="${i}"]`);
          popup.textContent = `day ${i + 1}, wins ${monthDayMetaArr[index][i].wins}, losses ${monthDayMetaArr[index][i].losses}, draws ${monthDayMetaArr[index][i].draws}`;
        }
      }
    } catch (error) {
      console.error(`Error has occurred: ${error.message}`);
    }
  }
}

document.getElementById('form').addEventListener('submit', (e) => {
  // prevent the form from refreshing the page
  e.preventDefault();

  // get the value of the input
  const user = document.getElementById('form-input').value;

  // call the function that handles the Chess.com requests
  fetchData(user);
});


