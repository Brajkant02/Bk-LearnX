const hindibtn = document.getElementById("hindi-btn");
const englishbtn = document.getElementById("english-btn");

const hindisection = document.getElementById("hindi");
const englishsection = document.getElementById("english");


hindibtn.addEventListener("click", () => {
    hindisection.style.display = "grid";
    englishsection.style.display = "none";
    englishbtn.style.backgroundColor = "white"
    hindibtn.style.backgroundColor = "blue"
   
});
englishbtn.addEventListener("click", () => {
    englishsection.style.display = "grid";
    hindisection.style.display = "none";
    englishbtn.style.backgroundColor = "blue"
    hindibtn.style.backgroundColor = "white"
    
});


window.onload = () => {
    hindisection.style.display = "grid";
    hindibtn.style.backgroundColor = "blue"
    englishsection.style.display = "none";
}