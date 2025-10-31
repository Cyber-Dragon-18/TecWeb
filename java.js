function Menu1(){
    document.getElementsByClassName("login")[0].style.display = "none";
    document.getElementsByTagName('button')[4].style.display = "block";
    document.getElementsByTagName('button')[5].style.display = "block";
    document.getElementsByTagName('img')[0].style.marginLeft="0px";
	document.getElementsByTagName('img')[0].style.marginRight="auto";
	document.getElementsByClassName("logout")[0].style.display = "block";
}

function Instrucoes() {
    document.getElementsByClassName("Instrucoes")[0].style.display = "block";
}

function FecharInsts(){
    document.getElementsByClassName("Instrucoes")[0].style.display = "none";
}

function Classifcacao() {
    document.getElementsByClassName("Classifcacao")[0].style.display = "block";
}

function FecharClasf() {
    document.getElementsByClassName("Classifcacao")[0].style.display = "none";
}

function Escolhe(){
    document.getElementsByTagName('button')[4].style.display = "none";
    document.getElementsByTagName('button')[5].style.display = "none";
    document.getElementsByClassName('Escolher')[0].style.display = "block";
    document.getElementsByTagName('button')[2].style.display = "block";
    document.getElementsByClassName("logout")[0].style.display = "none";
    
}

function play1(){
    document.getElementsByClassName("Escolher")[0].style.display = "none";
    document.getElementsByTagName('button')[0].style.display = "block";
    document.getElementsByTagName('button')[1].style.display = "block";
    document.getElementsByClassName("surrender")[0].style.display = "block";
    play1();
}

function Home(){
    document.getElementsByTagName('button')[0].style.display = "none";
	document.getElementsByTagName('button')[1].style.display = "none";
	document.getElementsByTagName('button')[2].style.display = "none";
	document.getElementsByTagName('button')[4].style.display = "block";
	document.getElementsByTagName('button')[5].style.display = "block";
	document.getElementsByClassName("Chose1")[0].style.display = "none";
	document.getElementsByClassName("surrender")[0].style.display = "none";
	document.getElementById("alertbutton").style.display = "block";
	boardBack.style.display = "none";
	helpBack.style.display = "none";
	pieceBack.style.display = "none";
	boardBack.innerHTML="";
	helpBack.innerHTML="";
	pieceBack.innerHTML="";
	document.getElementsByClassName("logout")[0].style.display = "block";
	game=1;
}