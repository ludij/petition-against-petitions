(function() {
    var sign = $('#sign');
    var canvas = $('canvas');
    var canvasContext = canvas[0].getContext('2d');
    canvas.on('mousedown', function(e) {
        var posX = e.clientX - $(this).offset().left;
        var posY = e.clientY - $(this).offset().top - $(window).scrollTop();
        canvasContext.strokeStyle="#5C6566";
        canvasContext.shadowBlur="3";
        canvasContext.shadowColor = "#9AA89C";
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
        canvasContext.lineWidth = 5;
        canvasContext.beginPath();
        canvasContext.moveTo(posX, posY);
        canvas.on('mousemove', function(e) {
            var posX = e.clientX - $(this).offset().left;
            var posY = e.clientY - $(this).offset().top - $(window).scrollTop();
            console.log('positions: ', posX, posY);
            canvasContext.lineTo(posX, posY);
            canvasContext.moveTo(posX, posY);
            canvasContext.stroke();
            canvasContext.closePath();
        });
    });
    $(document).on('mouseup', function() {
        canvas.off('mousemove');
        var dataURL = canvas[0].toDataURL("image/png");
        sign.val(dataURL);
    });
})();
