// <![CDATA[
$(document).ready(function () {
    $(document).bind("contextmenu", function (e) {
        return false;
    });
});

document.onkeydown = function (e) {
    if (e.ctrlKey &&
        (e.keyCode === 85 || e.keyCode === 117)) {
        return false;
    } else {
        return true;
    }
};

$(document).keypress("u", function (e) {
    if (e.ctrlKey) {
        return false;
    }
    else {
        return true;
    }
});

document.addEventListener("auxclick", function (e) {
    if (event.button === 1) event.preventDefault();
});

$(document).keydown(function (event) {
    if (event.keyCode == 123) { // Prevent F12
        return false;
    } else if (event.ctrlKey && event.shiftKey && event.keyCode == 73) { // Prevent Ctrl+Shift+I        
        return false;
    }
});

function copyToClipboard() {

    var aux = document.createElement("input");
    aux.setAttribute("value", "print screen disabled!");
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    // Remove it from the body
    document.body.removeChild(aux);
}

$(window).keyup(function (e) {
    if (e.keyCode == 44) {
        copyToClipboard();
    }
});

document.addEventListener("keyup", function (e) {
    var keyCode = e.keyCode ? e.keyCode : e.which;
    if (keyCode == 44) {
        stopPrntScr();
    }
});

function stopPrntScr() {

    var inpFld = document.createElement("input");
    inpFld.setAttribute("value", ".");
    inpFld.setAttribute("width", "0");
    inpFld.style.height = "0px";
    inpFld.style.width = "0px";
    inpFld.style.border = "0px";
    document.body.appendChild(inpFld);
    inpFld.select();
    document.execCommand("copy");
    inpFld.remove(inpFld);
}