import oHoverable from 'o-hoverable';
import attachFastClick from 'fastclick';

let words = {};

document.addEventListener('DOMContentLoaded', () => {
  // make hover effects work on touch devices
  oHoverable.init();

  // remove the 300ms tap delay on mobile browsers
  attachFastClick(document.body);

  if (page === 'main' && document.documentElement.className === 'enhanced') {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        words = JSON.parse(xmlhttp.responseText);
        newRandomGuff();
      }
    };
    xmlhttp.open('GET', 'words.json', true);
    xmlhttp.send();
  }
});

function newRandomGuff() {
  let wordArray = Object.keys(words);

  let randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;

  while (words[wordArray[randomNumber]].slug === document.getElementsByClassName('latest-guff')[0].id) {
    randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;
  }

  const randomWord = words[wordArray[randomNumber]];

  const randomGuffElement = document.getElementsByClassName('random-guff')[0];

  let randomGuffClone = randomGuffElement.cloneNode(true);

  randomGuffClone.setAttribute('style', 'visibility: visible;');

  let refreshButton = randomGuffClone.getElementsByClassName('refresh')[0];

  if (!refreshButton) {
    refreshButton = document.createElement('span');
    refreshButton.className = 'refresh';
    randomGuffClone.getElementsByClassName('paraHeads')[0].appendChild(refreshButton);
  }

  refreshButton.addEventListener('click', () => {
    newRandomGuff();
  });

  let word = randomGuffClone.getElementsByClassName('word')[0];
  let details = randomGuffClone.getElementsByClassName('details')[0];
  const definition = details.getElementsByClassName('detail definition')[0];
  const usageExample = details.getElementsByClassName('detail usageexample')[0];
  const relatedWordsElement = details.getElementsByClassName('detail relatedwords')[0];

  word.href = randomWord.slug + '/';
  word.innerHTML = randomWord.word + '&raquo;';

  if (definition) {
    details.removeChild(definition);
  }
  if (randomWord.definition) {
    let newDefinitionElement = document.createElement('p');

    newDefinitionElement.className = 'detail definition';
    newDefinitionElement.innerHTML = '<strong>Translation into plain English</strong> ' + randomWord.definition;

    details.appendChild(newDefinitionElement);
  }

  if (usageExample) {
    details.removeChild(usageExample);
  }
  if (randomWord.usageexample) {
    let newUsageExampleElement = document.createElement('p');

    newUsageExampleElement.className = 'detail usageexample';
    newUsageExampleElement.innerHTML = randomWord.usageexample;

    details.appendChild(newUsageExampleElement);
  }

  if (relatedWordsElement) {
    details.removeChild(relatedWordsElement);
  }
  if (randomWord.relatedwords.length > 0) {
    let newRelatedWordsElement = document.createElement('p');

    newRelatedWordsElement.className = 'detail relatedwords';
    newRelatedWordsElement.innerHTML = 'Related: ';

    const relatedWords = randomWord.relatedwords;
    for (const relatedWord of relatedWords) {
      let relatedWordElement = document.createElement('a');
      relatedWordElement.href = relatedWord.slug + '/';
      relatedWordElement.innerHTML = relatedWord.word;
      if (relatedWords.indexOf(relatedWord) > 0) {
        newRelatedWordsElement.innerHTML += ', ';
      }
      newRelatedWordsElement.appendChild(relatedWordElement);
    }

    details.appendChild(newRelatedWordsElement);
  }
  document.getElementsByTagName('main')[0].insertBefore(randomGuffClone, randomGuffElement);
  document.getElementsByTagName('main')[0].removeChild(randomGuffElement);
}
