const subjectSelect = document.getElementById('subject');
const unitSelect = document.getElementById('unit');
const chapterHeading = document.getElementById('chapterName');
const currentChapter = document.getElementById('currentChapter');
const unitCards = Array.from(document.querySelectorAll('.unit-card'));

function formatUnitLabel(unitValue) {
    if (!unitValue) {
        return 'Unit';
    }

    const match = unitValue.match(/unit-?\d+/i);
    if (match) {
        return match[0].replace(/-/, ' ').toUpperCase();
    }

    return unitValue.replace(/-/g, ' ');
}

function updateUnitOptions() {
    const subject = subjectSelect.value;

    unitSelect.innerHTML = '<option value="">Select Unit</option>';

    if (!subject) {
        hideAllCards();
        chapterHeading.textContent = 'Select a subject and semester';
        currentChapter.textContent = 'Select subject and semester';
        return;
    }

    const matchingCards = unitCards.filter((card) => card.dataset.subject === subject);

    matchingCards.forEach((card) => {
        const option = document.createElement('option');
        option.value = card.dataset.unit;
        option.textContent = formatUnitLabel(card.dataset.unit);
        unitSelect.appendChild(option);
    });

    if (unitSelect.options.length > 1) {
        unitSelect.value = matchingCards[0].dataset.unit;
    }

    updateChapter();
}

function hideAllCards() {
    unitCards.forEach((card) => card.classList.remove('active'));
}

function updateChapter() {
    const subject = subjectSelect.value;
    const unit = unitSelect.value;

    hideAllCards();

    if (!subject) {
        chapterHeading.textContent = 'Select a subject and semester';
        currentChapter.textContent = 'Select subject and semester';
        return;
    }

    if (!unit) {
        chapterHeading.textContent = `${subject.toUpperCase()} Study Material`;
        currentChapter.textContent = 'Select a unit';
        return;
    }

    const selectedCard = unitCards.find(
        (card) => card.dataset.subject === subject && card.dataset.unit === unit
    );

    if (selectedCard) {
        selectedCard.classList.add('active');
        chapterHeading.textContent = `${subject.toUpperCase()} - ${formatUnitLabel(unit)}`;
        currentChapter.textContent = `${subject.toUpperCase()} - ${formatUnitLabel(unit)}`;
    } else {
        chapterHeading.textContent = 'Content not added yet';
        currentChapter.textContent = 'Content not added yet';
    }
}

subjectSelect.addEventListener('change', updateUnitOptions);
unitSelect.addEventListener('change', updateChapter);

document.addEventListener('DOMContentLoaded', () => {
    updateUnitOptions();
});
