const destructureDate = (date: string) => {
    const dateObject = new Date(date);

    return {
        day: dateObject.getDay(),
        month: dateObject.getMonth(),
        year: dateObject.getFullYear(),
    }
}

export const isSameDay = (dateA: string, dateB: string) => {
    const structA = destructureDate(dateA);
    const structB = destructureDate(dateB);

    return structA.day === structB.day && structA.month === structB.month && structA.year === structB.year;
}