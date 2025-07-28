import ical from 'ical-generator';

/**
 *  Erstellt eine iCalendar-Datei (.ics) für den Termin
 *  @param {Object} apt   – Datensatz aus appointments-Tabelle
 *  @param {"pending"|"confirmed"|"cancelled"} status
 *  @returns {string}     – kompletter ICS-String
 */

export function generateICS(apt, status ="pending"){
    const cal = ical ({
        name: "KomplettWebDesign Termin",
        domain: "komplettwebdesign.de",
        prodId: "//KomplettWebDesign//Booking 1.0//DE",
        timezone: "Europe/Berlin",
    });

    cal.createEvent({
        id: `apt-${apt.id}@komplettwebdesign.de`,
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
        summary: apt.title || "Beratungsgespräch",
        description: "Termin über die Komplettwebdesign-Buchungsplattform",
        organizer:{
            name: "KomplettWebdesign",
            email: "kontakt@komplettwebdesign.de"
        },
        status: status === "confirmed" ? "CONFIRMED" : "TENTATIVE",
        method: status === "cancelled" ? "CANCELLED" : "REQUEST",
    });

    return cal.toString();
}