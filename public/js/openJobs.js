// Load form attributes if possible
var formFields = ["title", "agency", "keywords", "borough", "minDate", "minSalary", "maxSalary", "nonResidency", "fullTime", "numPerPage", "page"];

formFields.forEach((field) => {
    let val = localStorage.getItem(`${field}`);
    if (val) {
        $(`#${field}`).val(val);
    }
});

const updateSliderDisplay = (min, max) => {
    let shownMin = 500 * Math.round(min / 500);
    let shownMax = 500 * Math.round(max / 500);

    // the actual values submitted by the form
    let postedMin = shownMin;
    let postedMax = shownMax;

    if (shownMin >= 200000) {
        shownMin = "200k+";
    }
    if (shownMax >= 200000) {
        shownMax = "200k+";
        postedMax = 9e9;
    }
    $("#salaryRangeValue").val("$" + shownMin + " - $" + shownMax);
    $("#minSalary").val(postedMin);
    $("#maxSalary").val(postedMax);

}

$(function () {
    $('#salarySlider').slider({
        range: true,
        min: 0,
        max: 200000,
        values: [Number($("#minSalary").val()), Number($("#maxSalary").val())],
        slide: function (event, ui) {

            updateSliderDisplay(ui.values[0], ui.values[1]);
        }
    });
});

updateSliderDisplay(Number($("#minSalary").val()), Number($("#maxSalary").val()));

$("#openJobSearch").submit(function (event) {
    $("#error").hide();
    $("#errorList").empty();
    const errors = [];

    const minDate = $("#minDate").val();
    if (minDate !== "") {
        const today = new Date();
        const formattedDate = minDate.substring(5, 7) + "/" + minDate.substring(8, 10) + "/" + minDate.substring(0, 4);
        if (new Date(formattedDate) > today) errors.push(`<li class="error">Date cannot be in the future</li>`);
    }


    const title = $("#title").val().trim();
    const agency = $("#agency").val().trim();
    const keywords = $("#keywords").val().trim();

    if (title.length > 100) errors.push(`<li class="error">Title is too long</li>`);
    if (agency.length > 100) errors.push(`<li class="error">Agency is too long</li>`);
    if (keywords.length > 200) errors.push(`<li class="error">Too many keywords</li>`);

    // Make sure the agency and title will have matches in the database
    const matchingAgencies = $('#agencyList option').filter(function () {
        var re = new RegExp(agency, 'i')
        return this.value.match(re);
    });

    const matchingTitles = $('#titleList option').filter(function () {
        var re = new RegExp(title, 'i')
        return this.value.match(re);
    });

    if (matchingAgencies.length === 0) errors.push(`<li class="error">No matching agencies</li>`);
    if (matchingTitles.length === 0) errors.push(`<li class="error">No matching titles</li>`);

    if (errors.length === 0) {
        // Store attributes to re-populate them after submission
        formFields.forEach((field) => {
            let val = $(`#${field}`).val();
            localStorage.setItem(`${field}`, val);
        });


    } else {
        $('#openJobSearch').trigger('reset'); // DEBUG
        $("#error").show();
        errors.forEach((e) => {
            $("#errorList").append(e);
        });

        // Reset slider
        updateSliderDisplay(Number($("#minSalary").val()), Number($("#maxSalary").val()));
        $("#salarySlider").slider("value", $("#salarySlider").slider("value"));
        $("#salarySlider").slider("values", [Number($("#minSalary").val()), Number($("#maxSalary").val())]);
        return false;
    }
    return true;
});


$("#nextPage").click(() => {
    let page = Number($("#page").val());
    let maxPage = Number($("#page").attr('max'));
    if (page < maxPage) {
        $("#page").val(page + 1);
        $("#openJobSearch").submit();
    }
});

$("#prevPage").click(() => {
    let page = Number($("#page").val());
    if (page > 1) {
        $("#page").val(page - 1);
        $("#openJobSearch").submit();
    }
});

$("#resetSearch").click(() => {
    $("#openJobSearch")[0].reset();

    // reset attributes that require special default values
    $("#page").val(1);
    updateSliderDisplay(Number($("#minSalary").val()), Number($("#maxSalary").val()));
    $("#salarySlider").slider("value", $("#salarySlider").slider("value"));
    $("#salarySlider").slider("values", [Number($("#minSalary").val()), Number($("#maxSalary").val())]);

    $("#openJobSearch").submit();
}
);


/*
TODO:
- pull in resume (text input here? - validate here)
*/
