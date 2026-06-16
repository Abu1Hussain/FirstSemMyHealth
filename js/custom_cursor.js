document.addEventListener("DOMContentLoaded", function () {
    // Inject the cursor HTML
    const cursorDot = document.createElement("div");
    cursorDot.className = "cursor-dot";
    
    const cursorOutline = document.createElement("div");
    cursorOutline.className = "cursor-outline";

    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorOutline);

    // Track mouse movement
    window.addEventListener("mousemove", function (e) {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        // Outline trails slightly with a small delay for a smooth effect
        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    // Add hover effects for interactive elements
    const interactables = document.querySelectorAll("a, button, input, select, .cursor-pointer");
    
    interactables.forEach(el => {
        el.addEventListener("mouseenter", () => {
            cursorOutline.style.width = "60px";
            cursorOutline.style.height = "60px";
            cursorOutline.style.backgroundColor = "rgba(79, 70, 229, 0.1)";
        });
        el.addEventListener("mouseleave", () => {
            cursorOutline.style.width = "40px";
            cursorOutline.style.height = "40px";
            cursorOutline.style.backgroundColor = "transparent";
        });
    });
    });
});

// ---------------------------------------------
// Premium Toast Notifications System
// ---------------------------------------------
if (typeof Swal !== 'undefined') {
    window.Toast = Swal.mixin({
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    // Overwrite the ugly default browser alert to use Premium Toasts!
    window.alert = function(message) {
        window.Toast.fire({
            icon: "info",
            title: message
        });
    };
}
