const jobTagForm = `
<form class="selectJobForm">
<label>
    Select a Job Tag
    <select class="tag" name="tag">
    <option value="">Tag this job</option>
    <option value="Applied">Applied</option>
    <option value="Rejected">Rejected</option>
    <option value="Interview Scheduled">Interview Scheduled</option>
    <option value="Offer Received">Offer Received</option>
    <option value="Remove Tag">Remove Tag</option>
    </select>
</label>

<div class="subForm" hidden>
    <label>
    Notes
    <textarea class="notes" name="notes" placeholder="Notes"></textarea>
    </label>
    <label>
    Confidence (1-10)
    <input class="confidence" type="number" min="1" max="10" value="5">
    </label>
    <button class="submitTag" name="submitTag">Submit</button>
    <button class="removeTag" name="removeTag">Remove Tag</button>
</div>
</form>
<div class="tagError" hidden>
<ul class="tagErrorList">

</ul>
</div>`; // Inserted into each job listing when viewed by an authenticated user


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

(function ($) {
    // form submission
    $("#openJobSearch").submit(function (event) {
        event.preventDefault();
        $("#error").hide();
        $("#errorList").empty();
        $("#jobListings").empty();
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

        // new
        const borough = $("#borough").val();
        let fullTime = $("#fullTime").prop("checked");
        let nonResidency = $("#nonResidency").prop("checked");
        let useResume = $("#useResume").prop("checked");
        const minSalary = $("#minSalary").val();
        const maxSalary = $("#maxSalary").val();
        const numPerPage = $("#numPerPage").val();
        let page = $("#page").val();
        let jobTag = $("#jobTag").val();

        let isAuthenticated = ($("#jobTag").length > 0);

        if (page < 1) {
            // the most recent search returned no results
            page = 1;
        }

        if (title.length > 100) errors.push(`<li class="error">Title is too long</li>`);
        if (agency.length > 100) errors.push(`<li class="error">Agency is too long</li>`);
        if (keywords.length > 200) errors.push(`<li class="error">Too many keywords</li>`);

        // Make sure the agency and title will have matches in the database
        const matchingAgencies = $('#agencyList option').filter(function () {
            var re = new RegExp(agency, 'i');
            return this.value.match(re);
        });

        const matchingTitles = $('#titleList option').filter(function () {
            var re = new RegExp(title, 'i');
            return this.value.match(re);
        });

        if (matchingAgencies.length === 0) errors.push(`<li class="error">No matching agencies</li>`);
        if (matchingTitles.length === 0) errors.push(`<li class="error">No matching titles</li>`);

        if (errors.length > 0) {
            $('#openJobSearch').trigger('reset');
            $("#error").show();
            errors.forEach((e) => {
                $("#errorList").append(e);
            });

            // Reset slider
            updateSliderDisplay(Number($("#minSalary").val()), Number($("#maxSalary").val()));
            $("#salarySlider").slider("value", $("#salarySlider").slider("value"));
            $("#salarySlider").slider("values", [Number($("#minSalary").val()), Number($("#maxSalary").val())]);

            $("#pageText").text(`No results`);
            return false;
        }

        else {
            let requestConfig = {
                method: 'POST',
                url: '/jobs/search',
                contentType: 'application/json',
                data: JSON.stringify({
                    agency,
                    title,
                    borough,
                    minSalary,
                    maxSalary,
                    keywords,
                    nonResidency,
                    fullTime,
                    minDate,
                    numPerPage,
                    page,
                    useResume,
                    jobTag
                })
            };

            $.ajax(requestConfig).then(function (responseMessage) {
                const jobDiv = $("#jobListings");
                let pageInfo;
                // console.log(responseMessage);

                if (responseMessage.redirect) {
                    window.location.replace(responseMessage.redirect);
                    return;
                }

                if (responseMessage.error) {
                    $("#error").show();
                    $("#errorList").append(responseMessage.error);
                    pageInfo = {
                        page: 0,
                        minPage: 1,
                        maxPage: 0,
                        numResults: 0
                    }
                } else {


                    responseMessage.jobs.map((jobListing) => {

                        let element;
                        if (isAuthenticated) {
                            element = $(
                                `<div class="listing" id=${jobListing._id}>
                            <p>${jobListing.title}</p> ${jobTagForm}
                            </div>`);

                        } else {
                            element = $(
                                `<div class="listing">
                            <p>${jobListing.title}</p>
                            </div>`);
                        }

                        // TODO: add rest of info for job in each listing. It should match handlebars
                        jobDiv.append(element);
                    });
                    pageInfo = responseMessage.pageInfo;
                    pageInfo.minPage = 1;
                }

                $("#page").val(pageInfo.page);
                $("#page").attr({
                    "min": pageInfo.minPage,
                    "max": pageInfo.maxPage
                });
                $("#pageText").text(`Page ${pageInfo.page}/${pageInfo.maxPage} Total: ${pageInfo.numResults} Jobs`);
            });
        }
    });
})(window.jQuery);

$("#nextPage").click((event) => {
    event.preventDefault();
    let page = Number($("#page").val());
    let maxPage = Number($("#page").attr('max'));
    if (!$("#error").is(":hidden")) return; // Don't try to get the next page when the search yielded an error
    if (page < maxPage) {
        $("#page").val(page + 1);
        $("#openJobSearch").submit();
    }
});

$("#prevPage").click((event) => {
    event.preventDefault();
    if (!$("#error").is(":hidden")) return; // Don't try to get the next page when the search yielded an error
    let page = Number($("#page").val());
    let minPage = Number($("#page").attr('min'));
    if (page > minPage) {
        $("#page").val(page - 1);
        $("#openJobSearch").submit();
    }
});

$("#resetSearch").click((event) => {
    event.preventDefault();
    $("#openJobSearch")[0].reset();

    // reset attributes that require special default values
    $("#useResume").prop("checked", false);
    $("#page").val(1);
    $("#numPerPage").val("10").change();
    updateSliderDisplay(Number($("#minSalary").val()), Number($("#maxSalary").val()));
    $("#salarySlider").slider("value", $("#salarySlider").slider("value"));
    $("#salarySlider").slider("values", [Number($("#minSalary").val()), Number($("#maxSalary").val())]);
    $("#openJobSearch").submit();
}
);

$("#submitSearchWithResume").click((event) => {
    event.preventDefault();
    $("#useResume").prop("checked", true);
    $("#openJobSearch").submit();
});

$("#submitSearch").click((event) => {
    event.preventDefault();
    $("#useResume").prop("checked", false);
    $("#openJobSearch").submit();
});

$(document).on('change', '.tag', function () {
    $(this).closest(".listing").find(".subForm").hide();
    const selected = $(this).val();
    if (selected === "Remove Tag") {
        $(this).closest('.selectJobForm').find('.removeTag').trigger('click');
        $(this).val("");
    } else if (selected !== "") {
        $(this).closest(".listing").find(".subForm").show();
    }
});

$(document).on('click', '.removeTag', function (event) {
    event.preventDefault();
    $(this).closest('.selectJobForm').find('.tag').val("").trigger('change');
    $(this).closest('.selectJobForm').submit();
});

$(document).on("submit", ".selectJobForm", function (event) {
    event.preventDefault();
    const errDiv = $(this).siblings(".tagError");
    const errList = errDiv.find(".tagErrorList");
    const subForm = $(this).find(".subForm");
    errList.empty();
    errDiv.hide();

    const errors = [];

    const jobId = $(this).closest('.listing').attr('id');
    const tag = $(this).find(".tag").val();
    const notes = $(this).find(".notes").val();
    const confidence = $(this).find('.confidence').val();

    const validTags = ["applied", "rejected", "interview scheduled", "offer received", ""];
    if (!validTags.includes(tag.toLowerCase())) errors.push(`<li class="tagError">Invalid tag</li>`);
    if (confidence < 1 || confidence > 10) errors.push(`<li class="tagError">Confidence must be 1-10</li>`);
    if (notes.length > 500) errors.push(`<li class="tagError">Notes must be <= 500 characters</li>`);

    if (errors.length > 0) {
        $(this).trigger('reset');
        errDiv.show();
        errors.forEach((e) => {
            errList.append(e);
        });
        return false;
    }

    else {
        let requestConfig = {
            method: 'POST',
            url: '/user/updateTag',
            contentType: 'application/json',
            data: JSON.stringify({
                jobId,
                applicationStatus: tag,
                notes,
                confidence
            })
        };

        $.ajax(requestConfig).then(function (responseMessage) {
            if (responseMessage.error) {
                errDiv.show();
                errList.append(responseMessage.error);
            } else {
                subForm.hide();
                $(this).val("");
            }
        });
    }
});

$(document).ready(() => {
    // Load initial jobs
    $("#openJobSearch").triggerHandler("submit")
});