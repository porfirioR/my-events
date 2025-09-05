INSERT INTO currencies (Id, Name, Symbol, Country) VALUES
(1, 'United States Dollar', '$', 'United States'),
(2, 'Euro', '€', 'Eurozone'),
(3, 'British Pound Sterling', '£', 'United Kingdom'),
(4, 'Guarani', '₲', 'Paraguay'),
(5, 'Argentine Peso', '$', 'Argentina'),
(6, 'Real', 'R$', 'Brazil'),
(7, 'Other', '$', '---');

INSERT INTO Periods (Id, Name, quantity) VALUES
(1, 'Day', 365),
(2, 'Week', 52),
(3, 'Month', 12),
(4, 'Custom', -1);

INSERT INTO [Types] (Id, name, Description) VALUES
(1, 'Progressive', 'Amounts increase by adding a constant value'),
(2, 'Fixed amount', 'Fixed amount for the duration of the loan'),
(3, 'Total', 'Total amount of the loan');