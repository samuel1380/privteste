window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
};

window.addEventListener("load", function () {
    let scriptLoaded = false;
    let t = document.createElement("script");
    t.async = true;
    t.src = "https://www.clarity.ms/tag/qrvnyh4yh1";

    t.onload = function () { scriptLoaded = true; };

    let y = document.getElementsByTagName("script")[0];
    y.parentNode.insertBefore(t, y);

    setTimeout(function () {
        if (!scriptLoaded) {
            console.warn("Microsoft Clarity não carregou.");
        }
    }, 5000);
});