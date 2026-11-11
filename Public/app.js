const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', maximumFractionDigits: 2
  }).format(number);
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'in progress') return 'in-progress';
  return 'pending';
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}


function showWeatherMessage(message, success = false) {
  const element = $('#weather-message');
  element.textContent = message;
  element.className = `message${success ? ' success' : ''}`;
  element.hidden = false;
}

function getWeatherTip(condition, temperature) {
  const weather = String(condition || '').toLowerCase();

  if (weather.includes('rain')) {
    return 'Rain is expected. Be careful when scheduling outdoor vehicle testing.';
  }

  if (temperature >= 35) {
    return 'It is very hot today. Allow vehicles and engines to cool before servicing.';
  }

  if (weather.includes('sun') || weather.includes('clear')) {
    return 'Good visibility today. Remember to check engine temperatures during testing.';
  }

  return 'Check the weather conditions before scheduling outdoor vehicle testing.';
}

async function loadWeather() {
  const button = $('#weather-refresh');
  button.disabled = true;

  showWeatherMessage('Loading current weather...');

  try {
    const data = await getJson('/api/weather');

    $('#weather-location').textContent =
      `${data.location}, ${data.country}`;

    $('#weather-temperature').textContent =
      `${data.temperature}°C`;

    $('#weather-condition').textContent =
      data.condition;

    $('#weather-icon').src = data.icon.startsWith('//')
      ? `https:${data.icon}`
      : data.icon;

    $('#weather-icon').alt = data.condition;

    $('#weather-humidity').textContent =
      `${data.humidity}%`;

    $('#weather-wind').textContent =
      `${data.wind} km/h`;

    $('#weather-tip').textContent =
      getWeatherTip(data.condition, Number(data.temperature));

    $('#weather-result').hidden = false;

    showWeatherMessage('Weather updated successfully.', true);

  } catch (error) {
    $('#weather-result').hidden = true;
    showWeatherMessage(`Problem: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}


async function loadDashboard() {
  $('#refresh-button').disabled = true;
  $('#page-message').textContent = 'Refreshing workshop data…';
  try {
    const [customers, jobsPayload] = await Promise.all([
      getJson('/api/customers'),
      getJson('/api/tuning-jobs/details')
    ]);
    const jobs = Array.isArray(jobsPayload) ? jobsPayload : (jobsPayload.data || []);

    $('#customer-count').textContent = customers.length;
    $('#job-count').textContent = jobs.length;
    $('#progress-count').textContent = jobs.filter(job => job.status === 'In Progress').length;
    $('#customers-badge').textContent = `${customers.length} record${customers.length === 1 ? '' : 's'}`;
    $('#jobs-badge').textContent = `${jobs.length} job${jobs.length === 1 ? '' : 's'}`;

    $('#customers-table').innerHTML = customers.length ? customers.map(customer => `
      <tr>
        <td><strong>${escapeHtml(customer.name)}</strong></td>
        <td>${escapeHtml(customer.vehicle_model || '—')}</td>
        <td>${escapeHtml(customer.plate_number || '—')}</td>
        <td>${escapeHtml(customer.phone || '—')}</td>
      </tr>`).join('') : '<tr><td colspan="4" class="empty-cell">No customer records found.</td></tr>';

    $('#jobs-table').innerHTML = jobs.length ? jobs.map(job => `
      <tr>
        <td><strong>${escapeHtml(job.customer_name || `Customer #${job.customer_id}`)}</strong></td>
        <td>${escapeHtml(job.service_type || '—')}</td>
        <td>${money(job.cost)}</td>
        <td><span class="status ${statusClass(job.status)}">${escapeHtml(job.status || 'Unknown')}</span></td>
      </tr>`).join('') : '<tr><td colspan="4" class="empty-cell">No tuning jobs found.</td></tr>';

    $('#page-message').textContent = 'Workshop data is up to date.';
  } catch (error) {
    $('#page-message').textContent = `Could not load workshop data: ${error.message}. Make sure the Node.js server is running.`;
    $('#customers-table').innerHTML = '<tr><td colspan="4" class="empty-cell">Customer data could not be loaded.</td></tr>';
    $('#jobs-table').innerHTML = '<tr><td colspan="4" class="empty-cell">Tuning jobs could not be loaded.</td></tr>';
  } finally {
    $('#refresh-button').disabled = false;
  }
}

function showVehicleMessage(message, success = false) {
  const element = $('#vehicle-message');
  element.textContent = message;
  element.className = `message${success ? ' success' : ''}`;
  element.hidden = false;
}

$('#vehicle-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const vin = $('#vin-input').value.trim().toUpperCase();
  const button = $('#lookup-button');
  $('#vehicle-result').hidden = true;

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    showVehicleMessage('Please enter a valid 17-character VIN. The letters I, O, and Q are not used.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Looking up…';
  showVehicleMessage('Contacting the vehicle-data service…');

  try {
    const data = await getJson(`/api/vehicle-lookup?vin=${encodeURIComponent(vin)}`);
    const fields = [
      ['Make', data.make], ['Model', data.model], ['Model year', data.modelYear],
      ['Vehicle type', data.vehicleType], ['Body class', data.bodyClass],
      ['Engine', data.engineModel], ['Displacement (L)', data.engineDisplacementL],
      ['Fuel type', data.fuelType], ['VIN', data.vin]
    ];
    $('#vehicle-result').innerHTML = fields.map(([label, value]) => `
      <div class="vehicle-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || 'Not available')}</strong></div>
    `).join('');
    $('#vehicle-result').hidden = false;
    showVehicleMessage(
      data.cached ? 'Vehicle details loaded from the short-term cache.' : 'Vehicle details retrieved successfully.',
      true
    );
  } catch (error) {
    showVehicleMessage(error.message || 'Vehicle lookup failed. Please try again.');
  } finally {
    button.disabled = false;
    button.textContent = 'Look up vehicle';
  }
});

$('#refresh-button').addEventListener('click', loadDashboard);

$('#weather-refresh').addEventListener('click', loadWeather);

loadDashboard();
loadWeather();