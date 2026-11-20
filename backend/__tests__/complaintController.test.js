jest.mock('../config/db', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('../utils/geminiAI', () => ({
  analyzeComplaint: jest.fn()
}));

jest.mock('../utils/emailService', () => ({
  sendComplaintConfirmation: jest.fn(),
  sendStatusUpdate: jest.fn(),
  sendAssignmentNotification: jest.fn()
}));

const { db } = require('../config/db');

const {
  analyzeComplaint
} = require('../utils/geminiAI');

const {
  submitComplaint,
  updateComplaintStatus,
  getComplaintById,
  getUserComplaints,
  getAllComplaints,
  assignComplaint,
  deleteComplaint
} = require('../controllers/complaintController');

const createResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

describe('Complaint Controller - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TU-01: Submit complaint without title
  test('TU-01 - should return 400 when title is missing', async () => {

    // Arrange
    const req = {
      body: {
        description: 'Internet connection problem'
      },
      user: {
        id: 6
      }
    };

    const res = createResponse();
    const next = jest.fn();

    // Act
    await submitComplaint(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Title and description are required'
    });

    expect(db.query).not.toHaveBeenCalled();
    expect(analyzeComplaint).not.toHaveBeenCalled();
  });


  // TU-02: Submit complaint without description
  test('TU-02 - should return 400 when description is missing', async () => {

    // Arrange
    const req = {
      body: {
        title: 'Internet problem'
      },
      user: {
        id: 6
      }
    };

    const res = createResponse();
    const next = jest.fn();

    // Act
    await submitComplaint(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Title and description are required'
    });

    expect(db.query).not.toHaveBeenCalled();
    expect(analyzeComplaint).not.toHaveBeenCalled();
  });


  // TU-03: Update complaint with invalid status
  test('TU-03 - should return 400 for an invalid status', async () => {

    // Arrange
    const req = {
      params: {
        id: '1'
      },
      body: {
        status: 'unknown'
      },
      user: {
        id: 7,
        role: 'staff'
      }
    };

    const res = createResponse();
    const next = jest.fn();

    // Act
    await updateComplaintStatus(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid status value'
    });

    expect(db.query).not.toHaveBeenCalled();
  });


  // TU-04: Get a complaint that does not exist
  test('TU-04 - should return 404 when complaint does not exist', async () => {

    // Arrange
    const req = {
      params: {
        id: '999999'
      },
      user: {
        id: 6,
        role: 'user'
      }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query.mockResolvedValueOnce({
      rows: []
    });

    // Act
    await getComplaintById(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Complaint not found'
    });
  });


  // TU-05: Assign complaint without staff ID
  test('TU-05 - should return 400 when staff ID is missing', async () => {

    // Arrange
    const req = {
      params: {
        id: '1'
      },
      body: {},
      user: {
        id: 1,
        role: 'admin'
      }
    };

    const res = createResponse();
    const next = jest.fn();

    // Act
    await assignComplaint(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Staff ID is required'
    });

    expect(db.query).not.toHaveBeenCalled();
  });


  // TU-06: Assign complaint to an invalid staff member
  test('TU-06 - should return 400 when staff member is invalid', async () => {

    // Arrange
    const req = {
      params: {
        id: '1'
      },
      body: {
        staffId: 999999
      },
      user: {
        id: 1,
        role: 'admin'
      }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query.mockResolvedValueOnce({
      rows: []
    });

    // Act
    await assignComplaint(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid staff member'
    });
  });

  // TU-07 - User cannot access another user's complaint
  test('TU-07 - should return 403 when user accesses another user complaint', async () => {
    // Arrange
    const req = {
      params: { id: '1' },
      user: { id: 10, role: 'user' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        submittedBy: 20
      }]
    });

    // Act
    await getComplaintById(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied'
    });
  });

  // TU-08 - Updating a nonexistent complaint
  test('TU-08 - should return 404 when complaint does not exist during status update', async () => {
    // Arrange
    const req = {
      params: { id: '999999' },
      body: { status: 'resolved' },
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query.mockResolvedValueOnce({
      rows: []
    });

    // Act
    await updateComplaintStatus(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Complaint not found'
    });
  });

  // TU-09 - Staff cannot update a complaint assigned to another staff member
  test('TU-09 - should return 403 when staff updates an unassigned complaint', async () => {
    // Arrange
    const req = {
      params: { id: '1' },
      body: { status: 'resolved' },
      user: { id: 10, role: 'staff' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        assignedTo: 20
      }]
    });

    // Act
    await updateComplaintStatus(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'You can only update your assigned complaints'
    });
  });

  // TU-10 - Successfully submit a complaint
  test('TU-10 - should create a complaint successfully', async () => {
    // Arrange
    const req = {
      body: {
        title: 'Internet connection problem',
        description: 'My internet connection is frequently interrupted.'
      },
      user: {
        id: 10,
        email: 'user@test.com',
        name: 'Test User'
      }
    };

    const res = createResponse();
    const next = jest.fn();

    analyzeComplaint.mockResolvedValueOnce({
      category: 'Technical',
      priority: 'high',
      suggestedDepartment: 'IT',
      sentiment: 'negative',
      summary: 'Internet connection issue'
    });

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 55 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 55,
          title: 'Internet connection problem',
          description: 'My internet connection is frequently interrupted.',
          category: 'Technical',
          priority: 'high',
          status: 'pending',
          submittedBy: 10,
          aiCategory: 'Technical',
          aiPriority: 'high',
          aiSuggestedDepartment: 'IT',
          aiSentiment: 'negative',
          aiSummary: 'Internet connection issue'
        }]
      });

    // Act
    await submitComplaint(req, res, next);

    // Assert
    expect(analyzeComplaint).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledTimes(4);
    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Complaint submitted successfully',
        complaint: expect.objectContaining({
          id: 55,
          title: 'Internet connection problem',
          status: 'pending'
        })
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  // TU-11 - Successfully update complaint status
  test('TU-11 - should update complaint status successfully', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      body: {
        status: 'resolved',
        resolution: 'The technical problem has been fixed.'
      },
      user: {
        id: 1,
        role: 'admin'
      }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 55,
          title: 'Internet connection problem',
          status: 'in-progress',
          assignedTo: 20,
          submittedBy: 10,
          submittedByEmail: 'user@test.com',
          submittedByName: 'Test User',
          resolutionNote: null
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 55,
          title: 'Internet connection problem',
          status: 'resolved',
          resolutionNote: 'The technical problem has been fixed.',
          submittedBy: 10,
          submittedByName: 'Test User',
          submittedByEmail: 'user@test.com'
        }]
      });

    // Act
    await updateComplaintStatus(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(4);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Status updated successfully',
        complaint: expect.objectContaining({
          id: 55,
          status: 'resolved',
          resolutionNote: 'The technical problem has been fixed.'
        })
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  // TU-12 - Get user's complaints with status filter and pagination
  test('TU-12 - should return user complaints with pagination', async () => {
    // Arrange
    const req = {
      query: {
        status: 'pending',
        page: '2',
        limit: '5'
      },
      user: { id: 10, role: 'user' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Internet problem',
          status: 'pending',
          submittedBy: 10
        }]
      })
      .mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

    // Act
    await getUserComplaints(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[1][1]).toEqual([10, 'pending']);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        total: 1,
        page: 2,
        complaints: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            status: 'pending'
          })
        ])
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  // TU-13 - Get all complaints with filters for Staff
  test('TU-13 - should return filtered complaints for staff', async () => {
    // Arrange
    const req = {
      query: {
        status: 'pending',
        category: 'technical',
        priority: 'high',
        search: 'internet',
        page: '2',
        limit: '5'
      },
      user: { id: 20, role: 'staff' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Internet problem',
          status: 'pending',
          submittedBy: 10,
          assignedTo: 20
        }]
      })
      .mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

    // Act
    await getAllComplaints(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(2);

    expect(db.query.mock.calls[0][1]).toEqual([
      20, 'pending', 'technical', 'high', '%internet%', 5, 5
    ]);

    expect(db.query.mock.calls[1][1]).toEqual([
      20, 'pending', 'technical', 'high', '%internet%'
    ]);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        total: 1,
        page: 2,
        complaints: expect.arrayContaining([
          expect.objectContaining({ id: 1 })
        ])
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  // TU-14 - Successfully assign a complaint to Staff
  test('TU-14 - should assign a complaint successfully', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      body: { staffId: 20 },
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 20,
          name: 'Staff Member',
          email: 'staff@test.com'
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 55,
          title: 'Internet problem',
          status: 'pending',
          submittedBy: 10
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 55,
          title: 'Internet problem',
          status: 'in-progress',
          submittedBy: 10,
          assignedTo: 20,
          assignedToName: 'Staff Member',
          assignedToEmail: 'staff@test.com'
        }]
      });

    // Act
    await assignComplaint(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(6);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Complaint assigned successfully',
        complaint: expect.objectContaining({
          id: 55,
          status: 'in-progress',
          assignedTo: expect.objectContaining({
            _id: 20,
            name: 'Staff Member'
          })
        })
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  // TU-15 - Successfully delete an existing complaint
  test('TU-15 - should delete a complaint successfully', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 55 }]
      })
      .mockResolvedValueOnce({
        rows: []
      });

    // Act
    await deleteComplaint(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Complaint deleted successfully'
    });

    expect(next).not.toHaveBeenCalled();
  });

  // TU-16 - Handle database error during status update
  test('TU-16 - should pass database errors to next during status update', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      body: { status: 'resolved' },
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();
    const error = new Error('Database error during status update');

    db.query.mockRejectedValueOnce(error);

    // Act
    await updateComplaintStatus(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  // TU-17 - Handle database error during assignment
  test('TU-17 - should pass database errors to next during assignment', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      body: { staffId: 20 },
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();
    const error = new Error('Database error during assignment');

    db.query.mockRejectedValueOnce(error);

    // Act
    await assignComplaint(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  // TU-18 - Handle database error during deletion
  test('TU-18 - should pass database errors to next during deletion', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();
    const error = new Error('Database error during deletion');

    db.query.mockRejectedValueOnce(error);

    // Act
    await deleteComplaint(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  // TU-19 - Handle database error when retrieving all complaints
  test('TU-19 - should pass database errors to next when retrieving all complaints', async () => {
    // Arrange
    const req = {
      query: {},
      user: { id: 1, role: 'admin' }
    };

    const res = createResponse();
    const next = jest.fn();
    const error = new Error('Database error while retrieving complaints');

    db.query.mockRejectedValueOnce(error);

    // Act
    await getAllComplaints(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  // TU-20 - Retrieve an existing complaint successfully
  test('TU-20 - should retrieve an existing complaint successfully', async () => {
    // Arrange
    const req = {
      params: { id: '55' },
      user: { id: 10, role: 'user' }
    };

    const res = createResponse();
    const next = jest.fn();

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 55,
        title: 'Internet problem',
        description: 'Internet connection is unavailable',
        category: 'technical',
        priority: 'high',
        status: 'pending',
        submittedBy: 10,
        submittedByName: 'Test User',
        submittedByEmail: 'user@test.com',
        assignedTo: null,
        assignedToName: null,
        assignedToEmail: null
      }]
    });

    // Act
    await getComplaintById(req, res, next);

    // Assert
    expect(db.query).toHaveBeenCalledTimes(1);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        complaint: expect.objectContaining({
          id: 55,
          title: 'Internet problem',
          status: 'pending'
        })
      })
    );

    expect(next).not.toHaveBeenCalled();
  });






});
