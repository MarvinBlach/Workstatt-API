document.addEventListener('DOMContentLoaded', function() {
    const submitButton = document.querySelector('[hs-question-submit]');
    if (!submitButton) return; // Exit if button not found
    
    const PRODUCT_HANDLE = '{{ product.handle }}';

    // Schema definition for validation
    const questionSchema = {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
            email: { 
                type: 'string', 
                pattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$' 
            },
            category: { 
                type: 'string',
                enum: ['question', 'review']
            }
        },
        required: ['title', 'name', 'email', 'category'],
        additionalProperties: false
    };

    function getInputElement(attribute) {
        return document.querySelector(`[${attribute}]`);
    }

    function getInputValue(attribute) {
        const input = getInputElement(attribute);
        return input ? input.value.trim() : '';
    }

    function validateSchema(data, schema) {
        // Basic schema validation
        const errors = [];
        
        for (const field of schema.required) {
            if (!data[field]) {
                errors.push(`${field} is required`);
            }
        }

        if (data.email && !data.email.match(schema.properties.email.pattern)) {
            errors.push('Invalid email format');
        }

        if (data.category && !schema.properties.category.enum.includes(data.category)) {
            errors.push('Invalid category');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    function showSuccessMessage() {
        const successElement = document.querySelector('[frage-success]');
        if (successElement) {
            successElement.style.display = 'flex';
        }
    }

    submitButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Submit button clicked');

        const formData = {
            title: getInputValue('hs-question-text'),
            name: getInputValue('hs-question-name'),
            email: getInputValue('hs-question-email'),
            category: 'question' // Fixed as 'question' for this form
        };

        // Log the initial form data
        console.log('Initial Form Data:', formData);

        // Validate against schema
        const validation = validateSchema(formData, questionSchema);
        console.log('Validation Result:', validation);

        if (!validation.valid) {
            alert(`Validierungsfehler: ${validation.errors.join(', ')}`);
            return;
        }

        submitButton.style.pointerEvents = 'none';
        submitButton.value = 'Wird gesendet...';

        // Log the final request payload
        console.log('Final API Request Payload:', JSON.stringify(formData, null, 2));

        fetch(`https://assistant.workstatt.cloud/reviews/product/${PRODUCT_HANDLE}`, {
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            console.log('API Response Status:', response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(JSON.stringify(err));
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response Data:', data);
            showSuccessMessage();
        })
        .catch(error => {
            console.error('Error Details:', error);
            alert('Es gab einen Fehler beim Senden Ihrer Frage. Bitte versuchen Sie es erneut.');
        })
        .finally(() => {
            submitButton.style.pointerEvents = 'auto';
            submitButton.value = 'Frage stellen';
        });
    });

    console.log('Question submission handler initialized');
});
