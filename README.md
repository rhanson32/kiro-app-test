# Data Table Manager

A React-based web application for managing tabular data with AWS Amplify and Entra ID authentication.

## Features

- **Authentication**: Secure login with Microsoft Entra ID integration
- **Data Management**: View, create, edit, and delete data entries
- **Search & Filter**: Real-time search and filtering capabilities
- **CSV Import**: Bulk import data from CSV files
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Live data synchronization

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Authentication**: AWS Amplify with Entra ID
- **Data Storage**: Databricks integration
- **Testing**: Jest, React Testing Library, fast-check (Property-Based Testing)
- **Styling**: CSS with responsive design

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- AWS Account with Amplify setup
- Microsoft Entra ID tenant
- Databricks workspace

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   - Entra ID client ID and authority
   - AWS Amplify configuration
   - Databricks connection details

### Development

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Testing

Run tests:
```bash
npm test
```

Run property-based tests:
```bash
npm test -- --testNamePattern="Property"
```

### Building

Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/          # React components
├── services/           # API services and data management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── config/             # Configuration files
└── tests/              # Test files
```

## Configuration

### Environment Variables

See `.env.example` for required environment variables.

### AWS Amplify

The application uses AWS Amplify for authentication and backend services. Configure your Amplify project with:

- Cognito User Pool for authentication
- Entra ID as identity provider
- API Gateway for backend services

### Databricks Integration

Configure Databricks connection for data operations:

- SQL Execution REST API
- Personal Access Token authentication
- Proper network access configuration

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests for review

## License

This project is licensed under the MIT License.