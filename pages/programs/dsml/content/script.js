const courseConfig = {
    courseName: "PGDSML Semester-1",

    subjects: {
        fdsml: {
            name: "Fundamentals of DSML",
            units: ["Unit-1", "Unit-2", "Unit-3", "Unit-4", "Unit-5"]
        },

        maths: {
            name: "Essential Mathematics",
            units: ["Unit-1", "Unit-2", "Unit-3", "Unit-4"]
        },

        python: {
            name: "Python for Data Science",
            units: ["Unit-1", "Unit-2", "Unit-3", "Unit-4", "Unit-5", "Unit-6", "Unit-7", "Unit-8", "Unit-9"]
        },

        dstools: {
            name: "Data Science Tools & Techniques",
            units: ["Unit-1", "Unit-2", "Unit-3", "Unit-4", "Unit-5"]
        },

        seminar: {
            name: "Seminar and Case Studies",
            units: ["Unit-1"]
        }
    }
};

const subjectSelect = document.getElementById("subject");
const unitSelect = document.getElementById("unit");
const chapterHeading = document.getElementById("chapterName");
const currentChapter = document.getElementById("currentChapter");
const courseTitle = document.getElementById("courseTitle");
const unitCards = Array.from(document.querySelectorAll("unit-card"));

courseTitle.textContent = courseConfig.courseName;

function loadSubjects() {
    Object.keys(courseConfig.subjects).forEach(subjectKey => {
        const option = document.createElement("option");
        option.value = subjectKey;
        option.textContent = courseConfig.subjects[subjectKey].name;
        subjectSelect.appendChild(option);
    });
}

function updateUnit() {
    const subject = subjectSelect.value;

    unitSelect.innerHTML = '<option value="">Select Unit</option>';
    hideAllCards();

    if (!subject) {
        chapterHeading.textContent = "Select a subject";
        currentChapter.textContent = "Select subject and unit";
        return;
    }

    courseConfig.subjects[subject].units.forEach(unit => {
        const option = document.createElement("option");
        option.value = unit;
        option.textContent = unit;
        unitSelect.appendChild(option);
    });

    chapterHeading.textContent = courseConfig.subjects[subject].name;
    currentChapter.textContent = "Select a unit";
}

function getUnitKey(unitValue) {
    if (!unitValue) return "";

    const match = unitValue.toLowerCase().match(/unit-\d+/);
    return match ? match[0] : "";
}

function hideAllCards() {
    unitCards.forEach(card => {
        card.classList.remove("active");
    });
}

function updateChapter() {
    const subject = subjectSelect.value;
    const unit = unitSelect.value;
    const selectedUnitKey = getUnitKey(unit);

    hideAllCards();

    if (!subject) {
        chapterHeading.textContent = "Select a subject";
        currentChapter.textContent = "Select subject and unit";
        return;
    }

    if (!unit) {
        chapterHeading.textContent = courseConfig.subjects[subject].name;
        currentChapter.textContent = "Select a unit";
        return;
    }

    let contentFound = false;

    unitCards.forEach(card => {
        const cardSubject = card.getAttribute("data-subject");
        const cardUnit = card.getAttribute("data-unit");

        if (cardSubject === subject && cardUnit === selectedUnitKey) {
            card.classList.add("active");
            contentFound = true;
        }
    });

    const subjectName = courseConfig.subjects[subject].name;

    chapterHeading.textContent = `${subjectName} - ${unit}`;
    currentChapter.textContent = `${subjectName} • ${unit}`;

    if (!contentFound) {
        currentChapter.textContent = "Content not added yet";
    }
}

subjectSelect.addEventListener("change", updateUnit);
unitSelect.addEventListener("change", updateChapter);

document.addEventListener("DOMContentLoaded", () => {
    loadSubjects();
});