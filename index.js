const id = e => document.getElementById(e);
const queryAll = e => document.querySelectorAll(e);
let length;
let caretPos
let regexQuery;

let computeMode = true //try to determine the word
//if false, then try to get as much information to help us determine the word
function toggleComputeMode() {
    let e = id('toggleComputeMode')
    if (computeMode) {
        computeMode = false
        e.style.border = 'red solid 2px'
        e.innerHTML = 'Toggle Compute Mode (Compute Mode Off)'
    } else {
        computeMode = true
        e.style.border = '1px solid #ffb3b3'
        e.innerHTML = 'Toggle Compute Mode (Compute Mode On)'

    }
}
id('toggleComputeMode').addEventListener('click', toggleComputeMode)
function getLettersFromHTML() {
    regexQuery = allInputs.map((e, i) => {
        let val = e.value;
        return val ?
            computeMode ?
                val :
                `[^${val}]` :
            allInputsNotLetters[i].value ?
                `[^${allInputsNotLetters[i].value}]` :
                '.';
    }).join('')
    /* if (!computeMode) {
        let illegalChars = []
        allInputs.forEach(e => {
            illegalChars.push(`(?!.+^${e.value})`)
        })
        regexQuery = illegalChars.join('') + regexQuery
    } */
}
let allInputs = [];
let allInputsNotLetters = [];

let lengthPromptInProgres = false;
function getLength() {
    lengthPromptInProgres = true
    return new Promise(res => {
        let lenOverlay
        function finish() {
            length = parseInt(document.querySelector('.overlayContainer input').value)
            if (isNaN(length)) {
                let warning = document.createElement('p')
                warning.innerHTML = 'Cannot accept this length'
                lenOverlay.appendChild(warning)

                setTimeout(_ => warning.remove(), 1500)
            } else {
                document.removeEventListener('keyup', keyEvent)
                document.querySelector('.promptLen').remove()
                lengthPromptInProgres = false
                res()
            }
        }
        function keyEvent(e) {
            e.key === 'Enter' && finish()
        }
        let newDiv = document.createElement('div')
        newDiv.classList.add('promptLen')
        lenOverlay = document.createElement('div')
        lenOverlay.classList.add('overlayContainer')

        let descriptor = document.createElement('h2')
        descriptor.innerHTML = 'Word Length'
        lenOverlay.appendChild(descriptor)

        let input = document.createElement('input')
        lenOverlay.appendChild(input)

        let submit = document.createElement('button')
        submit.id = 'submitButton'
        submit.innerHTML = 'Submit'
        submit.addEventListener('click', finish)
        lenOverlay.appendChild(submit)

        newDiv.appendChild(lenOverlay)

        document.body.insertBefore(newDiv, document.body.firstChild)

        input.focus()
        document.addEventListener('keyup', keyEvent)
    })
}
async function promptLength() {
    queryAll('#knownLetters input, #knownIllegalLetters input').forEach(e => e.remove());
    await getLength();
    allInputs = [];
    allInputsNotLetters = []

    for (let i = 0; i < length; i++) {
        let wordInput = document.createElement('input');
        wordInput.classList.add('letter');
        wordInput.addEventListener('focus', _ => {
            currentFocus = i
        })
        allInputs.push(wordInput);
        id("knownLetters").appendChild(wordInput);

        let notInput = document.createElement('input');
        notInput.classList.add('letter');
        notInput.addEventListener('focus', _ => {
            currentFocus = i
        })
        allInputsNotLetters.push(notInput);

        [wordInput, notInput].forEach(e => {
            e.addEventListener('keydown', function (f) {
                caretPos = this.selectionStart
            })
        })
        id("knownIllegalLetters").appendChild(notInput);
    }
}
promptLength();
id('changeLength').addEventListener('click', promptLength);
let lastTime
function compute() {
    let t0 = performance.now()
    queryAll('#possibleWords p, #comWords p').forEach(e => e.remove());
    getLettersFromHTML();

    let lettersNotIn = {};
    let lettersIn = {};
    queryAll('#knownIllegalLetters input').forEach(f => {
        f.value.split('').forEach(e => {
            lettersIn[e] = 1
        })
    })
    let letters = [];
    queryAll('#knownLetters input').forEach(e => e.value && letters.push(e.value));
    id("illegalLetters").value.split('').forEach(e => {
        lettersNotIn.hasOwnProperty(e) ? lettersNotIn[e]++ : lettersNotIn[e] = 1;
        if ((lettersIn.hasOwnProperty(e) || letters.includes(e)) && lettersNotIn[e] < 2) {
            lettersNotIn[e] = 2;
        }
    })
    let lettersFromInput = []
    if (!computeMode) {
        queryAll('#knownLetters input').forEach(e => {
            e.value.split('').forEach(f => {
                lettersFromInput.push(f)
                lettersNotIn[f] = 1
            })
        })
    }
    let compiledRegex = new RegExp(`^${regexQuery}$`, 'mgi')
    let partialResults = engWords.match(compiledRegex)
    function includeTimes(word, phrase) {
        let index = 0;
        let times = 0;
        while (word.indexOf(phrase, index) !== -1) {
            index = word.indexOf(phrase, index) + 1;
            times++;
        }
        return times;
    }

    if (partialResults) {
        let results = partialResults.filter(e => {
            for (let item in lettersIn) {
                if (includeTimes(e, item) < lettersIn[item]) return false;
            }
            for (let item in lettersNotIn) {
                let times = includeTimes(e, item);
                if (lettersFromInput.includes(item) && !computeMode) {
                    if (e.includes(item)) return false;
                }
                if (times >= 1 && !letters.includes(item) && !lettersIn.hasOwnProperty(item)) {
                    if (e.includes(item)) return false;
                }
            }
            return true;
        })
        if (!computeMode) {
            //remove words with duplicate letters in not compute mode
            results = results.filter(e => {
                let letters = []
                for (let letter of e.split('')) {
                    if (letters.includes(letter)) return false
                    letters.push(letter)
                }
                return true
            })
        }
        postProcess(results)
        lastTime = performance.now() - t0;
        id('computeTime').innerHTML = `Request completed in ${lastTime}MS.`;
    } else {
        id('addWords').innerHTML = `No words found`;
    }
}
function computeWordsWithLetters() {
    let t0 = performance.now()
    queryAll('#possibleWords p, #comWords p').forEach(e => e.remove());
    let allLetters = document.querySelector('#inclusiveWords input').value.split('')
    let results = engWords.split('\n').filter(e => allLetters.every(f => e.includes(f)) && e.length == length)
    postProcess(results)
    id('computeTime').innerHTML = `Request completed in ${performance.now() - t0}MS.`
}
function postProcess(results) {
    //then, compute how much 'points' each word is worth by seeing if it has the most common letters
    //the more common its letters are, the more likely it is for us to stumble into a letter that is yellow or green
    results = results.map(e => {
        let letterScore = 0
        let lettersEncountered = []
        e.split('').forEach(f => {
            if (!lettersEncountered.includes(f)) letterScore += Math.floor(letterCount[f] / 100) ?? 0
            lettersEncountered.push(f)
        })
        return [e, letterScore]
    })
    let resultsCommonWords = []
    for (let i = 0; i < results.length; i++) { //move most common words into their separate array
        if (commonWords.has(results[i][0])) {
            resultsCommonWords.push(results[i])
            results.splice(i, 1)
        }
    }
    //quicksort remaining results from high to low
    function sort(arr) {
        function swap(a, b) {
            let placeholder = arr[a]
            arr[a] = arr[b]
            arr[b] = placeholder
        }
        function partition(low, high) {
            let pivotPos = low + Math.floor((high - low) / 2)
            let pivot = arr[pivotPos][1]
            let i = low
            let j = high
            while (i <= j) {
                try {
                    while (arr[i][1] >= pivot) {
                        i++
                    }
                } catch { }
                do {
                    j--
                } while (arr[j][1] < pivot)
                if (i <= j) {
                    swap(i, j)
                    if (j === pivotPos) pivotPos = i
                }
            }
            swap(pivotPos, j)
            return j
        }
        function quickSort(low, high) {
            if (low < high) {
                let partitionHappenedAt = partition(low, high)
                quickSort(low, partitionHappenedAt)
                quickSort(partitionHappenedAt + 1, high)
            }
        }
        quickSort(0, arr.length - 1)
    }
    sort(results)

    let wordsDiv = id('possibleWords');
    for (let i = 0; i < 75 && i < results.length; i++) {
        let newp = document.createElement('p');
        newp.innerHTML = `${results[i][0]}(Score: ${results[i][1]})`;
        wordsDiv.appendChild(newp);
    }

    sort(resultsCommonWords)
    let comWords = id('comWords')
    for (let i = 0; i < 50 && i < resultsCommonWords.length; i++) {
        let newp = document.createElement('p');
        newp.innerHTML = `${resultsCommonWords[i][0]}(Score: ${resultsCommonWords[i][1]})`;
        newp.style.borderColor = 'blue';
        comWords.appendChild(newp);
    }
    id('comWordsInfo').innerHTML = `${resultsCommonWords.length} common words, ${resultsCommonWords.length - 50 < 0 ?
        resultsCommonWords.length :
        50
        } shown`
    id('addWords').innerHTML = results.length >= 75 ? `And ${results.length - 75} more words not shown` : `${results.length} words shown`;

}
/**
 * removes elements that are changed and make the program ready for the next word to guess
 * @returns void
 */
function clear() {
    queryAll('#knownLetters input, #illegalLetters, #knownIllegalLetters input').forEach(e => e.value = '');
    queryAll('#possibleWords p').forEach(e => e.remove());
    id('addWords').innerHTML = '';
}
id('submitSearch').addEventListener('click', compute);
let currentFocus = null;
function focusCursor(key) {
    if (document.activeElement.id !== 'illegalLetters') {
        if (currentFocus !== null) {
            if (currentFocus <= allInputs.length - 1) {
                if (document.activeElement.parentNode.id == 'knownLetters') {
                    if (key === ' ') {
                        allInputs[currentFocus ?? 0].value = '';
                    }
                    key === 'Backspace' ? currentFocus >= 1 && caretPos === 0 && currentFocus-- : currentFocus < allInputs.length - 1 && currentFocus++;
                    if (key === 'Backspace') allInputs[currentFocus].value = '';
                } else {
                    try { //if we press space, remove that space char from the middle of div
                        allInputsNotLetters[currentFocus].value = allInputsNotLetters[currentFocus].value.match(/[^\s]/g).join('')
                    } catch {
                        allInputsNotLetters[currentFocus].value = ''
                    }
                    if (key === ' ' && currentFocus < allInputs.length - 1) currentFocus++
                    if (key === 'Backspace' && currentFocus >= 1 && caretPos === 0) {
                        currentFocus--
                    }
                }
                try {
                    document.activeElement.parentNode.id == 'knownLetters' ?
                        allInputs[currentFocus ?? 0].focus() :
                        allInputsNotLetters[currentFocus ?? 0].focus()
                } catch { }
            }
        } else {
            allInputs[0].focus();
        }
    }
}
let siteInfo = JSON.parse(window.localStorage.getItem('siteInfo')) ?? {
    visitedTimes: 1
}
if (siteInfo.visitedTimes > 3) document.querySelector('#pageBottom p').innerHTML = ''
siteInfo.visitedTimes++
window.localStorage.setItem('siteInfo', JSON.stringify(siteInfo))

document.addEventListener('keypress', e => e.key === 'Enter' && !document.activeElement.parentNode.classList.contains('overlayContainer') && compute());
document.querySelector('#inclusiveWords button').addEventListener('click', computeWordsWithLetters)
document.addEventListener('keyup', e => {
    if (!document.activeElement.parentNode.classList.contains('overlayContainer'))
        e.key === 'Escape' ?
            clear() :
            e.key.toLowerCase() === 'c' && document.activeElement.tagName !== 'INPUT' ?
                toggleComputeMode() :
                e.key.toLowerCase() == 'i' ?
                    computeWordsWithLetters() :
                    (e.key === 'Backspace' ||
                        /^[a-z\s]$/i.test(e.key)) &&
                        !['illegalLetters', 'lettersInWord', 'inclusiveWordsInput'].includes(document.activeElement.id)
                    && focusCursor(e.key)
});